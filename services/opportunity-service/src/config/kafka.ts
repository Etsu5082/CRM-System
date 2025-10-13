import { Kafka, Producer, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'opportunity-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_USERNAME ? true : undefined,
  sasl: process.env.KAFKA_USERNAME ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD || '',
  } : undefined,
});

let producer: Producer;
let consumer: Consumer;

export const initKafkaProducer = async () => {
  producer = kafka.producer();
  await producer.connect();
  console.log('✅ Kafka Producer connected');
};

export const initKafkaConsumer = async () => {
  consumer = kafka.consumer({ groupId: 'opportunity-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['customer.events', 'user.events'], fromBeginning: false });
  console.log('✅ Kafka Consumer connected');
  return consumer;
};

export const publishEvent = async (topic: string, event: any) => {
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

export const disconnectKafka = async () => {
  if (producer) await producer.disconnect();
  if (consumer) await consumer.disconnect();
  console.log('✅ Kafka disconnected');
};
