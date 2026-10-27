export function isValidStay(checkIn: Date, checkOut: Date): boolean {
  return Number.isFinite(checkIn.getTime()) && Number.isFinite(checkOut.getTime()) && checkOut.getTime() > checkIn.getTime();
}

export function datesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}
