import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)

struct UpdatePayload: Codable {
    let calendar: String?
    let title: String?
    let start: String?
    let end: String?
    let location: String?
    let notes: String?
}

func printUsage() {
    print("""
    Usage:

      CalendarEventKit find <calendar> <title> <occurrence-date>

      CalendarEventKit delete-occurrence <calendar> <title> <occurrence-date>

      CalendarEventKit update <calendar> <title> <occurrence-date> <json-payload>

    Examples:

      CalendarEventKit find "Work" "Bridge Test" "2026-09-17T18:00:00"

      CalendarEventKit delete-occurrence "Work" "Bish heart worm and flea meds" "2026-09-18T16:00:00"
    """)
}

func parseDate(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

    return formatter.date(from: value)
}

func findCalendar(named calendarName: String) -> EKCalendar? {
    let calendars = store.calendars(for: .event)

    return calendars.first {
        $0.title == calendarName
    }
}

func findOccurrence(
    calendarName: String,
    title: String,
    occurrenceDate: Date
) -> EKEvent? {

    guard let calendar = findCalendar(named: calendarName) else {
        print("DEBUG: Calendar not found.")
        print("Calendar: \(calendarName)")
        return nil
    }

    print("")
    print("DEBUG: Calendar found")
    print("Calendar: \(calendar.title)")

    let searchStart = occurrenceDate.addingTimeInterval(-60 * 60)
    let searchEnd = occurrenceDate.addingTimeInterval(60 * 60)

    let predicate = store.predicateForEvents(
        withStart: searchStart,
        end: searchEnd,
        calendars: [calendar]
    )

    let events = store.events(matching: predicate)

    print("")
    print("DEBUG: EventKit returned \(events.count) candidate event(s)")

    for event in events {
        print("-----")
        print("Title: \(event.title ?? "")")
        print("Event ID: \(event.eventIdentifier ?? "")")
        print("Start: \(String(describing: event.startDate))")
        print("End: \(String(describing: event.endDate))")
        print("Occurrence Date: \(String(describing: event.occurrenceDate))")
        print("Detached: \(event.isDetached)")
        print("Recurring: \(event.recurrenceRules?.isEmpty == false)")
    }

    let tolerance: TimeInterval = 60

    let matches = events.filter { event in
        guard let eventStart = event.startDate else {
            return false
        }

        let sameTitle = event.title == title

        let sameStartTime =
            abs(eventStart.timeIntervalSince(occurrenceDate)) <= tolerance

        return sameTitle && sameStartTime
    }

    print("")
    print("DEBUG: Matching events: \(matches.count)")

    if matches.count > 1 {
        print("WARNING: Multiple events matched.")

        for event in matches {
            print(
                "MATCH: \(event.title ?? "") | " +
                "\(String(describing: event.startDate)) | " +
                "\(event.eventIdentifier ?? "")"
            )
        }
    }

    return matches.first
}

func performUpdate(
    event: EKEvent,
    payload: UpdatePayload
) throws {

    if let calendarName = payload.calendar {
        if let targetCalendar = findCalendar(named: calendarName) {
            event.calendar = targetCalendar
        } else {
            throw NSError(
                domain: "CalendarEventKit",
                code: 10,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Calendar not found: \(calendarName)"
                ]
            )
        }
    }

    if let title = payload.title {
        event.title = title
    }

    if let startString = payload.start {
        guard let startDate = parseDate(startString) else {
            throw NSError(
                domain: "CalendarEventKit",
                code: 11,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Invalid start date: \(startString)"
                ]
            )
        }

        event.startDate = startDate
    }

    if let endString = payload.end {
        guard let endDate = parseDate(endString) else {
            throw NSError(
                domain: "CalendarEventKit",
                code: 12,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Invalid end date: \(endString)"
                ]
            )
        }

        event.endDate = endDate
    }

    if let location = payload.location {
        event.location = location
    }

    if let notes = payload.notes {
        event.notes = notes
    }

    guard let startDate = event.startDate,
          let endDate = event.endDate else {
        throw NSError(
            domain: "CalendarEventKit",
            code: 13,
            userInfo: [
                NSLocalizedDescriptionKey:
                    "Event must have valid start and end dates."
            ]
        )
    }

    guard endDate > startDate else {
        throw NSError(
            domain: "CalendarEventKit",
            code: 14,
            userInfo: [
                NSLocalizedDescriptionKey:
                    "Event end must occur after event start."
            ]
        )
    }

    try store.save(
        event,
        span: .thisEvent,
        commit: true
    )
}

let arguments = CommandLine.arguments

guard arguments.count >= 2 else {
    printUsage()
    exit(1)
}

let command = arguments[1]

guard command == "find" ||
      command == "delete-occurrence" ||
      command == "update" else {

    print("ERROR: Unknown command '\(command)'")
    printUsage()
    exit(1)
}

guard arguments.count >= 5 else {
    print("ERROR: Missing calendar, title, or occurrence date.")
    printUsage()
    exit(1)
}

let calendarName = arguments[2]
let title = arguments[3]
let occurrenceDateString = arguments[4]

guard let occurrenceDate = parseDate(occurrenceDateString) else {
    print("ERROR: Invalid occurrence date.")
    print("Expected format: yyyy-MM-dd'T'HH:mm:ss")
    exit(1)
}

var updatePayload: UpdatePayload?

if command == "update" {
    guard arguments.count >= 6 else {
        print("ERROR: Missing update JSON payload.")
        printUsage()
        exit(1)
    }

    let json = arguments[5]

    guard let data = json.data(using: .utf8) else {
        print("ERROR: Could not read update JSON.")
        exit(1)
    }

    do {
        updatePayload = try JSONDecoder().decode(
            UpdatePayload.self,
            from: data
        )
    } catch {
        print("ERROR: Invalid update JSON.")
        print(error)
        exit(1)
    }
}

store.requestAccess(to: .event) { granted, error in

    if let error = error {
        print("ERROR: \(error)")
        semaphore.signal()
        return
    }

    guard granted else {
        print("ERROR: Calendar access was not granted.")
        semaphore.signal()
        return
    }

    guard let event = findOccurrence(
        calendarName: calendarName,
        title: title,
        occurrenceDate: occurrenceDate
    ) else {

        print("")
        print("ERROR: Event occurrence not found.")
        print("Calendar: \(calendarName)")
        print("Title: \(title)")
        print("Occurrence: \(occurrenceDateString)")

        semaphore.signal()
        return
    }

    print("")
    print("FOUND OCCURRENCE")
    print("Title: \(event.title ?? "")")
    print("Event ID: \(event.eventIdentifier ?? "")")
    print("Calendar: \(event.calendar.title)")
    print("Start: \(String(describing: event.startDate))")
    print("End: \(String(describing: event.endDate))")
    print("Recurring: \(event.recurrenceRules?.isEmpty == false)")

    if command == "find" {
        print("")
        print("READ-ONLY TEST")
        print("No changes were made to Calendar.")
        semaphore.signal()
        return
    }

    if command == "delete-occurrence" {

        print("")
        print("Attempting to delete ONLY this occurrence...")

        do {
            try store.remove(
                event,
                span: .thisEvent,
                commit: true
            )

            print("SUCCESS")
            print("Only this occurrence was deleted.")

        } catch {
            print("ERROR: EventKit failed to delete occurrence.")
            print(error)
        }

        semaphore.signal()
        return
    }

    if command == "update" {

        guard let payload = updatePayload else {
            print("ERROR: Missing update payload.")
            semaphore.signal()
            return
        }

        print("")
        print("Attempting to update this event...")

        do {
            try performUpdate(
                event: event,
                payload: payload
            )

            print("SUCCESS")
            print("Event updated successfully.")
            print("Event ID: \(event.eventIdentifier ?? "")")

        } catch {
            print("ERROR: EventKit failed to update event.")
            print(error)
        }

        semaphore.signal()
        return
    }
}

semaphore.wait()
