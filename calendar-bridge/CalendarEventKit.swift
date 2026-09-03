import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)

func printUsage() {
    print("""
    Usage:

      CalendarEventKit find <event-id> <occurrence-date>
      CalendarEventKit delete-occurrence <event-id> <occurrence-date>

    Example:

      CalendarEventKit find "56A35F56-E664-4308-9922-CA1297B5D10E" "2026-09-29T19:00:00"
    """)
}

func parseDate(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

    return formatter.date(from: value)
}

func findOccurrence(
    eventID: String,
    occurrenceDate: Date
) -> EKEvent? {

    // Find the recurring series itself.
    guard let seriesEvent = store.event(withIdentifier: eventID) else {
        print("DEBUG: Could not locate base event.")
        return nil
    }

    print("")
    print("DEBUG: Base event found")
    print("Title: \(seriesEvent.title ?? "")")
    print("Event ID: \(seriesEvent.eventIdentifier ?? "")")
    print("Start: \(String(describing: seriesEvent.startDate))")
    print("Occurrence Date: \(String(describing: seriesEvent.occurrenceDate))")
    print("Recurring: \(seriesEvent.recurrenceRules?.isEmpty == false)")

    // Print recurrence information.
    if let rules = seriesEvent.recurrenceRules {
        print("")
        print("DEBUG: RECURRENCE RULES")

        for rule in rules {
            print("Frequency: \(rule.frequency.rawValue)")
            print("Interval: \(rule.interval)")
            print("Recurrence End: \(String(describing: rule.recurrenceEnd))")
            print("Days Of Week: \(String(describing: rule.daysOfTheWeek))")
            print("Months Of Year: \(String(describing: rule.monthsOfTheYear))")
            print("Weeks Of Year: \(String(describing: rule.weeksOfTheYear))")
            print("Days Of Year: \(String(describing: rule.daysOfTheYear))")
            print("Set Positions: \(String(describing: rule.setPositions))")
        }
    } else {
        print("")
        print("DEBUG: NO RECURRENCE RULES FOUND")
    }

    // Search around the requested occurrence.
    let searchStart = seriesEvent.startDate.addingTimeInterval(-60 * 60)
    let searchEnd = occurrenceDate.addingTimeInterval(60 * 60 * 24)

    let predicate = store.predicateForEvents(
        withStart: searchStart,
        end: searchEnd,
        calendars: [seriesEvent.calendar]
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

    return events.first { event in

        guard let eventStart = event.startDate else {
            return false
        }

        let sameSeries =
            event.eventIdentifier == seriesEvent.eventIdentifier

        let sameStartTime =
            abs(eventStart.timeIntervalSince(occurrenceDate)) <= tolerance

        return sameSeries && sameStartTime
    }
}

let arguments = CommandLine.arguments

guard arguments.count >= 2 else {
    printUsage()
    exit(1)
}

let command = arguments[1]

guard command == "find" || command == "delete-occurrence" else {
    print("ERROR: Unknown command '\(command)'")
    printUsage()
    exit(1)
}

guard arguments.count >= 4 else {
    print("ERROR: Missing event ID or occurrence date.")
    printUsage()
    exit(1)
}

let eventID = arguments[2]
let occurrenceDateString = arguments[3]

guard let occurrenceDate = parseDate(occurrenceDateString) else {
    print("ERROR: Invalid occurrence date.")
    print("Expected format: yyyy-MM-dd'T'HH:mm:ss")
    exit(1)
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
        eventID: eventID,
        occurrenceDate: occurrenceDate
    ) else {
        print("")
        print("ERROR: Event occurrence not found.")
        print("Event ID: \(eventID)")
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
}

semaphore.wait()