export class StaffScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffScopeError";
  }
}
