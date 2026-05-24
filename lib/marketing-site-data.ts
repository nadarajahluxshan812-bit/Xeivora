export type MarketingNavItem = {
  label: string;
  href: string;
  chevron?: boolean;
};

export type MarketingFeatureItem = {
  title: string;
  description: string;
  icon: MarketingIconKey;
};

export type MarketingStatItem = {
  label: string;
  value: string;
  icon: MarketingIconKey;
};

export type MarketingProductCard = {
  title: string;
  description: string;
  icon: MarketingIconKey;
  tabs: readonly string[];
};

export type MarketingCapabilityCard = {
  title: string;
  description: string;
  icon: MarketingIconKey;
};

export type MarketingSolutionCard = {
  title: string;
  description: string;
  icon: MarketingIconKey;
};

export type MarketingIconKey =
  | "messages"
  | "brain"
  | "code"
  | "globe"
  | "shield"
  | "users"
  | "file"
  | "rocket"
  | "layers"
  | "zap"
  | "lock"
  | "bot"
  | "knowledge"
  | "workflow"
  | "integrations"
  | "spark"
  | "chart"
  | "image"
  | "briefcase"
  | "heart"
  | "graduation"
  | "megaphone"
  | "cog";

export type MarketingResourceCard = {
  title: string;
  description: string;
  label: string;
  art: "planet" | "panel" | "wave" | "city" | "mesh" | "beams";
  tabs: readonly string[];
};

export type MarketingPricingPlan = {
  name: string;
  monthly: number | null;
  yearlyMonthlyEquivalent: number | null;
  description: string;
  cta: string;
  features: readonly string[];
  highlight?: boolean;
  badge?: string;
};

export const marketingNavItems = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "Solutions", href: "/solutions", chevron: true },
  { label: "Resources", href: "/resources", chevron: true },
  { label: "Pricing", href: "/pricing" }
] as const satisfies readonly MarketingNavItem[];

export const homeFeatureColumns = {
  left: [
    {
      title: "Smart Conversations",
      description: "Contextual, natural, deeply intelligent responses.",
      icon: "messages"
    },
    {
      title: "Memory & Continuity",
      description: "Remembers what matters. Always stays in context.",
      icon: "brain"
    },
    {
      title: "Code & Build",
      description: "Write, debug, and build with powerful AI.",
      icon: "code"
    },
    {
      title: "Real-World Tools",
      description: "Search, analyze, automate, create, and more.",
      icon: "globe"
    }
  ],
  right: [
    {
      title: "Enterprise Secure",
      description: "Your data is private, encrypted, and protected.",
      icon: "shield"
    },
    {
      title: "Collaborate & Share",
      description: "Work together with teams and AI agents.",
      icon: "users"
    },
    {
      title: "Files & Knowledge",
      description: "Upload, analyze, extract insights instantly.",
      icon: "file"
    },
    {
      title: "Agents & Workflows",
      description: "Automate tasks with smart AI agents.",
      icon: "rocket"
    }
  ]
} as const satisfies { left: readonly MarketingFeatureItem[]; right: readonly MarketingFeatureItem[] };

export const homeStats = [
  { label: "Conversations", value: "12M+", icon: "rocket" },
  { label: "Active Users", value: "300K+", icon: "users" },
  { label: "AI Models", value: "25+", icon: "layers" },
  { label: "Uptime", value: "99.9%", icon: "zap" },
  { label: "Enterprise Security", value: "Enterprise", icon: "lock" }
] as const satisfies readonly MarketingStatItem[];

export const trustedLogos = [
  "Google",
  "Microsoft",
  "OpenAI",
  "Anthropic",
  "AWS",
  "Vercel",
  "Notion",
  "Figma",
  "Stripe",
  "Canva"
] as const;

export const productTabs = [
  "All Products",
  "Core Platform",
  "AI Agents",
  "Development",
  "Productivity"
] as const;

export const productCards = [
  {
    title: "Xeivora Chat",
    description: "Smart, contextual conversations with leading AI models and memory.",
    icon: "messages",
    tabs: ["All Products", "Core Platform"]
  },
  {
    title: "Xeivora Agents",
    description: "Autonomous AI agents that work across tools and data.",
    icon: "bot",
    tabs: ["All Products", "AI Agents"]
  },
  {
    title: "Xeivora Code",
    description: "AI-powered coding assistant for faster development.",
    icon: "code",
    tabs: ["All Products", "Development"]
  },
  {
    title: "Xeivora Knowledge",
    description: "Upload, search, and extract insights from any document.",
    icon: "knowledge",
    tabs: ["All Products", "Productivity"]
  },
  {
    title: "Xeivora Workflows",
    description: "Automate complex tasks with no-code workflows.",
    icon: "workflow",
    tabs: ["All Products", "Core Platform"]
  },
  {
    title: "Xeivora Integrations",
    description: "Connect with your favorite tools and platforms.",
    icon: "integrations",
    tabs: ["All Products", "Productivity"]
  }
] as const satisfies readonly MarketingProductCard[];

export const capabilityCards = [
  {
    title: "Advanced Reasoning",
    description: "Multi-step reasoning and problem solving across any domain.",
    icon: "spark"
  },
  {
    title: "File Analysis",
    description: "Upload and analyze documents, CSVs, PDFs, and more.",
    icon: "file"
  },
  {
    title: "Memory & Context",
    description: "Persistent memory that remembers what matters across sessions.",
    icon: "brain"
  },
  {
    title: "Workflow Automation",
    description: "Automate repetitive tasks with intelligent workflows.",
    icon: "workflow"
  },
  {
    title: "Web Search",
    description: "Real-time web search for up-to-date information and insights.",
    icon: "globe"
  },
  {
    title: "Data Analysis",
    description: "Turn raw data into insights with AI-powered analysis.",
    icon: "chart"
  },
  {
    title: "Code Generation",
    description: "Generate, debug, and optimize code in any language.",
    icon: "code"
  },
  {
    title: "Integrations",
    description: "Seamlessly connect with tools and platforms.",
    icon: "integrations"
  },
  {
    title: "Image Understanding",
    description: "Analyze, describe, and extract insights from images.",
    icon: "image"
  },
  {
    title: "Multi-Model Intelligence",
    description: "Access top AI models with smart routing and fallback.",
    icon: "layers"
  }
] as const satisfies readonly MarketingCapabilityCard[];

export const solutionTabs = ["By Industry", "By Team", "By Use Case"] as const;

export const solutionsByTab = {
  "By Industry": [
    { title: "Technology", description: "Build, ship, and scale faster with AI.", icon: "messages" },
    { title: "Finance", description: "Analyze data, automate reports, and reduce risk.", icon: "briefcase" },
    { title: "Healthcare", description: "Improve patient outcomes with intelligent insights.", icon: "heart" },
    { title: "Education", description: "Enhance learning and empower educators.", icon: "graduation" },
    { title: "Marketing", description: "Create content, automate campaigns, and grow.", icon: "megaphone" },
    { title: "Sales", description: "Close more deals with AI-powered insights.", icon: "users" },
    { title: "Operations", description: "Streamline processes and boost efficiency.", icon: "cog" },
    { title: "Startups", description: "Move faster and build with smarter systems.", icon: "rocket" }
  ],
  "By Team": [
    { title: "Product Teams", description: "Turn briefs, feedback, and planning into faster execution.", icon: "spark" },
    { title: "Engineering", description: "Accelerate delivery with coding, debugging, and system reasoning.", icon: "code" },
    { title: "Support", description: "Resolve tickets faster with context-aware AI assistance.", icon: "messages" },
    { title: "Revenue", description: "Unify outreach, research, and account intelligence.", icon: "megaphone" },
    { title: "People Ops", description: "Scale onboarding, documentation, and internal knowledge.", icon: "users" },
    { title: "Leadership", description: "See live insights, risks, and decisions in one layer.", icon: "chart" },
    { title: "Security", description: "Apply controls, policies, and governance without slowing teams.", icon: "shield" },
    { title: "Operations", description: "Automate handoffs across systems and stakeholders.", icon: "workflow" }
  ],
  "By Use Case": [
    { title: "Knowledge Retrieval", description: "Search across docs, files, and tools with persistent memory.", icon: "knowledge" },
    { title: "Research Workflows", description: "Coordinate reasoning, sources, and summaries across models.", icon: "globe" },
    { title: "Agent Automation", description: "Launch intelligent task flows with triggers and approvals.", icon: "bot" },
    { title: "Content Systems", description: "Draft, refine, localize, and publish at scale.", icon: "spark" },
    { title: "AI Coding", description: "Generate, review, and fix production-ready code faster.", icon: "code" },
    { title: "Data Insights", description: "Turn files and raw numbers into useful decisions.", icon: "chart" },
    { title: "Multimodal Analysis", description: "Understand text, images, and structured inputs together.", icon: "image" },
    { title: "Executive Ops", description: "Keep projects moving with one intelligence layer across the stack.", icon: "layers" }
  ]
} as const satisfies Record<string, readonly MarketingSolutionCard[]>;

export const resourceTabs = [
  "All Resources",
  "Guides",
  "Blog",
  "Documentation",
  "Tutorials",
  "Case Studies",
  "Webinars"
] as const;

export const resourceCards = [
  {
    title: "Getting Started with Xeivora",
    description: "A complete walkthrough to help you get up and running in minutes.",
    label: "Guide",
    art: "planet",
    tabs: ["All Resources", "Guides"]
  },
  {
    title: "Build Your First AI Agent",
    description: "Create a powerful AI agent that can reason, search, and take action.",
    label: "Tutorial",
    art: "panel",
    tabs: ["All Resources", "Tutorials"]
  },
  {
    title: "The Future of AI Workflows",
    description: "Exploring how AI is transforming the way teams build and operate.",
    label: "Blog",
    art: "wave",
    tabs: ["All Resources", "Blog"]
  },
  {
    title: "How Acme Company Scaled with Xeivora",
    description: "See how a company improved productivity by 300%.",
    label: "Case Study",
    art: "city",
    tabs: ["All Resources", "Case Studies"]
  },
  {
    title: "Advanced Prompting Guide",
    description: "Master advanced prompting techniques for better results.",
    label: "Documentation",
    art: "mesh",
    tabs: ["All Resources", "Documentation"]
  },
  {
    title: "Live: Building Smarter with AI",
    description: "Join experts as they showcase real-world AI implementation.",
    label: "Webinar",
    art: "beams",
    tabs: ["All Resources", "Webinars"]
  }
] as const satisfies readonly MarketingResourceCard[];

export const pricingPlans = [
  {
    name: "Free",
    monthly: 0,
    yearlyMonthlyEquivalent: 0,
    description: "For individuals getting started with AI.",
    cta: "Get Started",
    features: ["Basic AI models", "Limited messages", "Standard memory", "Community support"]
  },
  {
    name: "Plus",
    monthly: 19,
    yearlyMonthlyEquivalent: 15,
    description: "For personal use with more power and flexibility.",
    cta: "Get Started",
    features: ["Advanced AI models", "More messages", "Extended memory", "Priority support"]
  },
  {
    name: "Pro",
    monthly: 49,
    yearlyMonthlyEquivalent: 39,
    description: "For professionals who need the best performance.",
    cta: "Get Started",
    highlight: true,
    badge: "Most Popular",
    features: [
      "All AI models",
      "Unlimited messages",
      "Advanced memory",
      "Priority support",
      "Early access to new features"
    ]
  },
  {
    name: "Enterprise",
    monthly: null,
    yearlyMonthlyEquivalent: null,
    description: "For teams and organizations with advanced needs.",
    cta: "Contact Sales",
    features: ["Custom integrations", "Dedicated support", "SLA & security", "Onboarding & training"]
  }
] as const satisfies readonly MarketingPricingPlan[];
