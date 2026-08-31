tell application "Calendar"

    set todayDate to current date
    set time of todayDate to 0

    set tomorrowDate to todayDate + (1 * days)

    set output to ""

    set calendarNames to {"Work", "Home", "Calendar", "Family"}

    repeat with calendarName in calendarNames

        try

            set currentCalendar to calendar (calendarName as string)

            set todaysEvents to (every event of currentCalendar whose start date is greater than or equal to todayDate and start date is less than tomorrowDate)

            repeat with currentEvent in todaysEvents

                try

                    set eventTitle to summary of currentEvent
                    set eventStart to start date of currentEvent
                    set eventEnd to end date of currentEvent

                    set eventLocation to ""

                    try
                        set eventLocation to location of currentEvent
                    end try

                    set output to output & (calendarName as string) & "|" & eventTitle & "|" & (eventStart as string) & "|" & (eventEnd as string) & "|" & eventLocation & linefeed

                end try

            end repeat

        end try

    end repeat

end tell

return output