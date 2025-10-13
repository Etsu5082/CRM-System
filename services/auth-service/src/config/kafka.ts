import { Kafka, Producer } from 'kafkajs';
import { DomainEvent } from '../types';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_USERNAME ? true : undefined,
  sasl: process.env.KAFKA_USERNAME ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD || '',
  } : undefined,
});

let producer: Producer;

export const initKafkaProducer = async () => {
  producer = kafka.producer();
  await producer.connect();
  console.log('✅ Kafka Producer connected');
};

export const publishEvent = async (topic: string, event: DomainEvent) => {
  // Skip if Kafka is not initialized
  if (!producer) {
    console.log(`⏭️  Skipping event publish (Kafka disabled): ${event.eventType}`);
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: event.eventId,
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`📤 Event published: ${event.eventType} to topic ${topic}`);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
    throw error;
  }
};

export const disconnectKafkaProducer = async () => {
  if (producer) {
    await producer.disconnect();
    console.log('✅ Kafka Producer disconnected');
  }
};
