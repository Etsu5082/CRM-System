// モックデータ - デモ用

export const mockCustomers = [
  {
    id: "1",
    name: "山田太郎",
    email: "yamada@example.com",
    company: "株式会社ABC商事",
    phone: "03-1234-5678",
    status: "ACTIVE",
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "2",
    name: "佐藤花子",
    email: "sato@example.com",
    company: "XYZ株式会社",
    phone: "03-2345-6789",
    status: "ACTIVE",
    createdAt: "2025-02-20T00:00:00Z",
  },
  {
    id: "3",
    name: "鈴木一郎",
    email: "suzuki@example.com",
    company: "テクノロジー株式会社",
    phone: "03-3456-7890",
    status: "ACTIVE",
    createdAt: "2025-03-10T00:00:00Z",
  },
];

export const mockTasks = [
  {
    id: "1",
    title: "提案書作成",
    description: "新規プロジェクトの提案書を作成する",
    dueDate: "2025-10-20T00:00:00Z",
    priority: "HIGH",
    status: "IN_PROGRESS",
    customerId: "1",
  },
  {
    id: "2",
    title: "フォローアップ電話",
    description: "先週の商談のフォローアップ",
    dueDate: "2025-10-18T00:00:00Z",
    priority: "MEDIUM",
    status: "TODO",
    customerId: "2",
  },
  {
    id: "3",
    title: "契約書確認",
    description: "法務部との契約書最終確認",
    dueDate: "2025-10-25T00:00:00Z",
    priority: "URGENT",
    status: "TODO",
    customerId: "3",
  },
];

export const mockMeetings = [
  {
    id: "1",
    title: "新規プロジェクト打ち合わせ",
    description: "来期のプロジェクトについて",
    scheduledAt: "2025-10-16T10:00:00Z",
    duration: 60,
    location: "本社会議室A",
    customerId: "1",
    attendees: ["山田太郎", "管理者"],
  },
  {
    id: "2",
    title: "製品デモ",
    description: "新製品のデモンストレーション",
    scheduledAt: "2025-10-17T14:00:00Z",
    duration: 90,
    location: "オンライン（Zoom）",
    customerId: "2",
    attendees: ["佐藤花子", "営業担当"],
  },
];

export const mockOpportunities = [
  {
    id: "1",
    title: "CRMシステム導入",
    description: "大規模CRMシステムの提案",
    value: 5000000,
    stage: "PROPOSAL",
    probability: 60,
    expectedCloseDate: "2025-12-31T00:00:00Z",
    customerId: "1",
  },
  {
    id: "2",
    title: "クラウド移行プロジェクト",
    description: "オンプレミスからクラウドへの移行",
    value: 8000000,
    stage: "NEGOTIATION",
    probability: 75,
    expectedCloseDate: "2025-11-30T00:00:00Z",
    customerId: "2",
  },
  {
    id: "3",
    title: "セキュリティ強化",
    description: "企業セキュリティシステムの導入",
    value: 3000000,
    stage: "QUALIFICATION",
    probability: 40,
    expectedCloseDate: "2026-01-31T00:00:00Z",
    customerId: "3",
  },
];

export const mockAnalyticsReport = {
  totalCustomers: 15,
  activeCustomers: 12,
  totalOpportunities: 8,
  totalOpportunityValue: 25000000,
  totalTasks: 24,
  completedTasks: 18,
  totalMeetings: 10,
};
