-- Two rapid/concurrent POST /attendance/clock-in requests could both pass the
-- "do I already have an open entry?" check before either INSERT completed,
-- leaving a user clocked in twice at once. A partial unique index makes the
-- database itself reject the second row, closing the race at its source.
CREATE UNIQUE INDEX "AttendanceEntry_userId_open_unique"
ON "AttendanceEntry" ("userId")
WHERE "clockOut" IS NULL;
