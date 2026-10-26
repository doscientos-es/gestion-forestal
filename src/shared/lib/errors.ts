/** Business-rule violation with a message that is safe to show to the user. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
