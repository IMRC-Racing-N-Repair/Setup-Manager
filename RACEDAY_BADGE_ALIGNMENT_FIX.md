# RaceDay yellow badge alignment fix

Updated file:

`features/raceday/components/RaceDayLineupBadge.js`

The race badge now displays only `RACE` and the race number with device-independent text metrics:

- Full-width centered label and race number
- Main/Qual labels removed from the badge
- Android font padding disabled
- Device font scaling prevented from overflowing the fixed badge
- Badge size and surrounding RaceDay card layout unchanged

This patch keeps the app version at 2.1.11.
