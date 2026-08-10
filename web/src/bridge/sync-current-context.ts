export async function syncCurrentContext(input: {
  context: Record<string, unknown>;
  messagePrompt: string;
  fallbackMessagePrompt?: string;
  updateModelContext: (context: Record<string, unknown>) => Promise<boolean>;
  sendMessage: (
    prompt: string,
    options?: { scrollToBottom?: boolean }
  ) => Promise<void>;
  scrollToBottom?: boolean;
}) {
  const updated = await input.updateModelContext(input.context);
  await input.sendMessage(
    updated ? input.messagePrompt : (input.fallbackMessagePrompt ?? input.messagePrompt),
    {
      scrollToBottom: input.scrollToBottom ?? false
    }
  );
  return updated ? ("context" as const) : ("message-fallback" as const);
}
