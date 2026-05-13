export interface BufferedEvent {
  type: string;
  [key: string]: unknown;
}

export class EventBroadcaster {
  private subscribers = new Map<
    string,
    { controller: ReadableStreamDefaultController<Uint8Array>; encoder: TextEncoder }
  >();
  private buffer: BufferedEvent[] = [];
  private maxBufferSize: number;
  private isComplete = false;

  constructor(maxBufferSize = 200) {
    this.maxBufferSize = maxBufferSize;
  }

  broadcast(event: BufferedEvent): void {

    this.buffer.push(event);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }

    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const [id, sub] of this.subscribers) {
      try {
        sub.controller.enqueue(sub.encoder.encode(data));
      } catch {
        this.subscribers.delete(id);
      }
    }
  }

  subscribe(
    subscriberId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    fromIndex = 0
  ): void {
    const encoder = new TextEncoder();
    this.subscribers.set(subscriberId, { controller, encoder });

    for (let i = fromIndex; i < this.buffer.length; i++) {
      const data = `data: ${JSON.stringify(this.buffer[i])}\n\n`;
      try {
        controller.enqueue(encoder.encode(data));
      } catch {
        this.subscribers.delete(subscriberId);
        return;
      }
    }
  }

  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  getSnapshot(): {
    lastToolStatus?: string;
    products: Array<{ id: string; name: string; type: string }>;
  } {
    let lastToolStatus: string | undefined;
    const products: Array<{ id: string; name: string; type: string }> = [];

    for (const event of this.buffer) {
      if (event.type === "tool_use") {
        lastToolStatus = (event.toolLabel as string) ?? (event.toolName as string);
      }
      if (event.type === "product_created") {
        products.push({
          id: event.productId as string,
          name: event.name as string,
          type: event.productType as string,
        });
      }
    }

    return { lastToolStatus, products };
  }

  markComplete(): void {
    this.isComplete = true;
  }

  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }
}
