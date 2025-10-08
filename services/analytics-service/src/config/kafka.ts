import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'analytics-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let consumer: Consumer;

export const initKafkaConsumer = async () => {
  consumer = kafka.consumer({ groupId: 'analytics-service-group' });
  await consumer.connect();
  await consumer.subscribe({
    topics: ['user.events', 'customer.events', 'sales.events', 'approval.events'],
    fromBeginning: false,
  });
  console.log('✅ Kafka Consumer connected');
  return consumer;
};

export const disconnectKafka = async () => {
  if (consumer) await consumer.disconnect();
  console.log('✅ Kafka disconnected');
};
