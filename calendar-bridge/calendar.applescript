tell application "Calendar"

    set todayDate to current date
    set time of todayDate to 0

    set tomorrowDate to todayDate + (1 * days)

    set output to ""

    set calendarNames to {"Work", "Home", "Calendar", "Family"}

    repeat with calendarName in calendarNames

        try

            set currentCalendar to calendar (calendarName as string)

            -- Bulk-fetch all event properties in ONE round trip each, instead of
            -- using "whose" (which checks every event individually and can take
            -- minutes on calendars with a lot of history) or looping with
            -- individual property gets (same problem).
            set eventSummaries to summary of every event of currentCalendar
            set eventStarts to start date of every event of currentCalendar
            set eventEnds to end date of every event of currentCalendar
            set eventLocations to location of every event of currentCalendar

            set eventCount to count of eventSummaries

            repeat with i from 1 to eventCount

                set eventStart to item i of eventStarts

                if eventStart is greater than or equal to todayDate and eventStart is less than tomorrowDate then

                    set eventTitle to item i of eventSummaries
                    set eventEnd to item i of eventEnds

                    set eventLocation to item i of eventLocations
                    if eventLocation is missing value then set eventLocation to ""

                    set output to output & (calendarName as string) & "|" & eventTitle & "|" & (eventStart as string) & "|" & (eventEnd as string) & "|" & eventLocation & linefeed

                end if

            end repeat

        end try

    end repeat

end tell

return output