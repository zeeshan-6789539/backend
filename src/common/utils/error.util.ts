const MAX_CAUSE_DEPTH = 5;

// Joins an error's message with its cause chain, since Drizzle puts the driver error on `cause`
export const describeError = (error: unknown): string => {
  const messages: string[] = [];
  let current: unknown = error;

  while (current !== undefined && messages.length < MAX_CAUSE_DEPTH) {
    if (!(current instanceof Error)) {
      messages.push(
        typeof current === 'string' ? current : JSON.stringify(current),
      );
      break;
    }

    messages.push(current.message);
    current = current.cause;
  }

  return messages.join(' — caused by: ');
};
