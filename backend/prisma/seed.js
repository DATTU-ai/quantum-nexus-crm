import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "../lib/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const teamSeed = [
  { name: "Sagar Dani", email: "sagar@dattucrm.com", role: "Sales" },
  { name: "Sarvesh Bendre", email: "sarvesh@dattucrm.com", role: "Sales" },
];

const companySeeds = [
  {
    companyName: "ABC Industries",
    industry: "Manufacturing",
    city: "Pune",
    country: "India",
    primaryContact: "Rahul Sharma",
    contactEmail: "rahul@abc.com",
    accountOwner: "Sagar Dani",
    status: "Prospect",
  },
  {
    companyName: "XYZ Pvt Ltd",
    industry: "IT Services",
    city: "Mumbai",
    country: "India",
    primaryContact: "Amit Verma",
    contactEmail: "amit@xyz.com",
    accountOwner: "Sarvesh Bendre",
    status: "Prospect",
  },
  {
    companyName: "Aurora Stack",
    industry: "SaaS",
    city: "San Francisco",
    country: "USA",
    primaryContact: "Lena Ortiz",
    accountOwner: "Sagar Dani",
    status: "Prospect",
  },
  {
    companyName: "Nimbus Grid",
    industry: "Energy",
    city: "Dubai",
    country: "UAE",
    primaryContact: "Alya Farouk",
    accountOwner: "Sarvesh Bendre",
    status: "Prospect",
  },
  {
    companyName: "Northstar Forge",
    industry: "Manufacturing",
    city: "Pune",
    country: "India",
    primaryContact: "Arjun Menon",
    accountOwner: "Sagar Dani",
    status: "Customer",
  },
  {
    companyName: "Crescent Pay",
    industry: "Fintech",
    city: "Toronto",
    country: "Canada",
    primaryContact: "Sophia Malik",
    accountOwner: "Sarvesh Bendre",
    status: "Prospect",
  },
  {
    companyName: "SignalBridge Telecom",
    industry: "Telecommunications",
    city: "Madrid",
    country: "Spain",
    primaryContact: "Lucia Romero",
    accountOwner: "Sagar Dani",
    status: "Customer",
  },
  {
    companyName: "Meridian Grid",
    industry: "Utilities",
    city: "Riyadh",
    country: "Saudi Arabia",
    primaryContact: "Fahad Al Noor",
    accountOwner: "Sarvesh Bendre",
    status: "Partner",
  },
  {
    companyName: "TerraSteel",
    industry: "Manufacturing",
    city: "Chennai",
    country: "India",
    primaryContact: "Vikram Iyer",
    accountOwner: "Sagar Dani",
    status: "Customer",
  },
  {
    companyName: "Vector Harbor",
    industry: "Maritime",
    city: "Rotterdam",
    country: "Netherlands",
    primaryContact: "Jasper van Dijk",
    accountOwner: "Sarvesh Bendre",
    status: "Partner",
  },
  {
    companyName: "NovaTech",
    industry: "Technology",
    city: "Bengaluru",
    country: "India",
    primaryContact: "Sagar Dani",
    accountOwner: "Sagar Dani",
    status: "Customer",
  },
  {
    companyName: "CloudNine Systems",
    industry: "Cloud Infrastructure",
    city: "Singapore",
    country: "Singapore",
    primaryContact: "Aisha Rahman",
    accountOwner: "Sarvesh Bendre",
    status: "Prospect",
  },
];

const leadStageCycle = [
  "Cold Lead",
  "Lead Captured",
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const opportunityStages = [
  "Opportunity Created",
  "Solution Proposal",
  "Commercial Proposal",
  "Negotiation",
  "Final Approval",
  "PO Received",
  "Deal Won",
  "Deal Lost",
];

const products = [
  "DATTU AI Platform",
  "AI Vision Suite",
  "Revenue Intelligence",
  "Industrial Control Tower",
  "Safety Training",
  "ESG Consulting",
];

const normalizeEmail = (seed) =>
  seed.contactEmail ||
  `${seed.primaryContact.toLowerCase().replace(/\s+/g, ".")}@${seed.companyName
    .toLowerCase()
    .replace(/\s+/g, "")}.com`;

const normalizeWebsite = (seed) =>
  `https://${seed.companyName.toLowerCase().replace(/\s+/g, "")}.ai`;

const main = async () => {
  console.log("Seeding database...");

  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.implementation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.demoTrial.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = process.env.DEMO_USER_PASSWORD || "QuantumCRM!2026";
  const passwordHash = await hashPassword(defaultPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: process.env.DEMO_USER_EMAIL || "admin@dattu.local",
      passwordHash,
      name: "DaTTU Admin",
      role: "admin",
    },
  });

  const sagarUser = await prisma.user.create({
    data: {
      name: "Sagar Dani",
      email: "sagar@dattucrm.com",
      role: "admin",
      passwordHash,
    },
  });

  const sarveshUser = await prisma.user.create({
    data: {
      name: "Sarvesh Bendre",
      email: "sarvesh@dattucrm.com",
      role: "sales",
      passwordHash,
    },
  });

  const teamMembers = [];
  for (const seed of teamSeed) {
    const member = await prisma.teamMember.create({ data: seed });
    teamMembers.push(member);
  }

  const sagarMember = teamMembers.find((member) => member.name === "Sagar Dani") || teamMembers[0];
  const sarveshMember = teamMembers.find((member) => member.name === "Sarvesh Bendre") || teamMembers[1] || teamMembers[0];
  const salesOwners = teamMembers.map((member) => member.name);

  const companyRecords = [];
  for (const seed of companySeeds) {
    const email = normalizeEmail(seed);
    const company = await prisma.company.create({
      data: {
        companyName: seed.companyName,
        industry: seed.industry,
        city: seed.city,
        country: seed.country,
        primaryContact: seed.primaryContact,
        phone: `+1-555-${Math.floor(Math.random() * 9000 + 1000)}`,
        email,
        website: normalizeWebsite(seed),
        accountOwner: seed.accountOwner,
        status: seed.status,
        notes: `${seed.companyName} seeded account.`,
      },
    });

    companyRecords.push(company);

    await prisma.contact.create({
      data: {
        companyId: company.id,
        name: seed.primaryContact,
        jobTitle: "Primary Stakeholder",
        department: "Operations",
        email,
        phone: company.phone,
        decisionMaker: true,
      },
    });
  }

  const getCompanyByName = (name) => companyRecords.find((company) => company.companyName === name);
  const abcCompany = getCompanyByName("ABC Industries") || companyRecords[0];
  const xyzCompany = getCompanyByName("XYZ Pvt Ltd") || companyRecords[1];

  const lead1 = await prisma.lead.create({
    data: {
      leadName: "ABC Industries - Rahul Sharma",
      companyName: abcCompany.companyName,
      companyId: abcCompany.id,
      contactName: "Rahul Sharma",
      designation: "Operations Manager",
      email: "rahul@abc.com",
      phone: abcCompany.phone,
      industry: abcCompany.industry,
      leadSource: "Website",
      status: "Cold Lead",
      leadOwnerId: sagarMember.id,
      companySize: "201-500",
      location: abcCompany.city,
      region: "India",
      priority: "Medium",
      productInterest: "Safety Training",
      dealValue: 120000,
      probability: 20,
      notes: "Seeded lead for ABC Industries.",
      lastActivityDate: subDays(new Date(), 1),
      nextFollowUpDate: addDays(new Date(), 1),
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      leadName: "XYZ Pvt Ltd - Amit Verma",
      companyName: xyzCompany.companyName,
      companyId: xyzCompany.id,
      contactName: "Amit Verma",
      designation: "Head of Sustainability",
      email: "amit@xyz.com",
      phone: xyzCompany.phone,
      industry: xyzCompany.industry,
      leadSource: "LinkedIn",
      status: "Lead Qualified",
      leadOwnerId: sarveshMember.id,
      companySize: "501-1,000",
      location: xyzCompany.city,
      region: "India",
      priority: "High",
      productInterest: "ESG Consulting",
      dealValue: 250000,
      probability: 55,
      notes: "Seeded qualified lead for XYZ Pvt Ltd.",
      lastActivityDate: subDays(new Date(), 2),
      nextFollowUpDate: addDays(new Date(), 2),
    },
  });

  const leads = [lead1, lead2];

  for (let index = 0; index < 18; index += 1) {
    const company = companyRecords[index % companyRecords.length];
    const stage = leadStageCycle[index % leadStageCycle.length];
    const leadOwner = teamMembers[index % teamMembers.length];
    const lead = await prisma.lead.create({
      data: {
        leadName: `Lead ${index + 1}`,
        companyName: company.companyName,
        companyId: company.id,
        contactName: company.primaryContact || `Contact ${index + 1}`,
        designation: "Operations Leader",
        email: company.email,
        phone: company.phone,
        industry: company.industry,
        leadSource: ["Website", "LinkedIn", "Referral", "Partner"][index % 4],
        status: stage,
        leadOwnerId: leadOwner.id,
        companySize: ["51-200", "201-500", "500-1,000"][index % 3],
        location: `${company.city}, ${company.country}`,
        region: company.country === "India" ? "India" : undefined,
        priority: ["Low", "Medium", "High"][index % 3],
        productInterest: products[index % products.length],
        dealValue: 65000 + index * 15000,
        probability: stage === "Closed Won" ? 100 : stage === "Closed Lost" ? 0 : 15 + (index % 8) * 10,
        notes: `Seeded lead ${index + 1}`,
        budget: "Approved",
        authority: "Buying committee engaged",
        need: "Workflow automation",
        timeline: "Current quarter",
        lastActivityDate: subDays(new Date(), index % 6),
        nextFollowUpDate: addDays(new Date(), (index % 5) + 1),
      },
    });
    leads.push(lead);

    await prisma.activity.create({
      data: {
        entityType: "lead",
        entityId: lead.id,
        type: index % 2 === 0 ? "Call" : "Email",
        title: "Lead touchpoint",
        description: `Seeded ${stage} activity for ${lead.companyName}.`,
        createdBy: leadOwner.name,
        activityDate: subDays(new Date(), index % 7),
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      {
        entityType: "lead",
        entityId: lead1.id,
        type: "Call",
        title: "Initial discussion",
        description: "Client interested in safety training",
        createdBy: sagarMember.name,
        activityDate: subDays(new Date(), 1),
      },
      {
        entityType: "lead",
        entityId: lead2.id,
        type: "Meeting",
        title: "Demo presentation",
        description: "Presented ESG solution",
        createdBy: sarveshMember.name,
        activityDate: subDays(new Date(), 2),
      },
    ],
  });

  const opportunities = [];

  const opp1 = await prisma.opportunity.create({
    data: {
      companyId: abcCompany.id,
      leadId: lead1.id,
      opportunityName: "Safety Training Deal",
      stage: "Commercial Proposal",
      dealValue: 120000,
      probability: 60,
      expectedCloseDate: addDays(new Date(), 25),
      owner: sagarMember.name,
      status: "Open",
      productService: "Safety Training",
      notes: "Seeded proposal-stage opportunity.",
    },
  });

  const opp2 = await prisma.opportunity.create({
    data: {
      companyId: xyzCompany.id,
      leadId: lead2.id,
      opportunityName: "ESG Consulting",
      stage: "Negotiation",
      dealValue: 250000,
      probability: 75,
      expectedCloseDate: addDays(new Date(), 35),
      owner: sarveshMember.name,
      status: "Open",
      productService: "ESG Consulting",
      notes: "Seeded negotiation-stage opportunity.",
    },
  });

  opportunities.push(opp1, opp2);

  for (let index = 0; index < 8; index += 1) {
    const lead = leads[index];
    const company = companyRecords[index % companyRecords.length];
    const stage = opportunityStages[index % opportunityStages.length];
    const salesOwner = salesOwners[index % salesOwners.length];
    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        leadId: lead.id,
        opportunityName: `${company.companyName} ${products[index % products.length]}`,
        stage,
        dealValue: 90000 + index * 40000,
        probability: stage === "Deal Won" ? 100 : stage === "Deal Lost" ? 0 : 35 + (index % 5) * 12,
        expectedCloseDate: addDays(new Date(), 10 + index * 3),
        owner: salesOwner,
        status: stage === "Deal Won" ? "Won" : stage === "Deal Lost" ? "Lost" : "Open",
        productService: products[index % products.length],
        notes: `Seeded opportunity ${index + 1}`,
      },
    });
    opportunities.push(opportunity);

    await prisma.activity.create({
      data: {
        entityType: "opportunity",
        entityId: opportunity.id,
        type: "Meeting",
        title: "Opportunity review",
        description: `Seeded ${stage} milestone for ${opportunity.opportunityName}.`,
        createdBy: opportunity.owner,
        activityDate: subDays(new Date(), index % 5),
      },
    });
  }

  await prisma.interaction.createMany({
    data: [
      {
        entityType: "lead",
        entityId: lead1.id,
        type: "call",
        summary: "Initial discovery call completed",
        details: "Reviewed safety training workflows and aligned on next stakeholder follow-up.",
        nextFollowUp: addDays(new Date(), 1),
        createdBy: sagarUser.id,
        createdAt: subDays(new Date(), 1),
      },
      {
        entityType: "lead",
        entityId: lead2.id,
        type: "meeting",
        summary: "Qualification workshop completed",
        details: "Budget approved but follow-up on proposal scope is overdue.",
        nextFollowUp: subDays(new Date(), 1),
        createdBy: sarveshUser.id,
        createdAt: subDays(new Date(), 8),
      },
      {
        entityType: "lead",
        entityId: leads[4]?.id || lead2.id,
        type: "email",
        summary: "Proposal reminder email sent",
        details: "Shared a concise proposal recap and requested stakeholder feedback.",
        nextFollowUp: addDays(new Date(), 2),
        createdBy: sagarUser.id,
        createdAt: subDays(new Date(), 2),
      },
      {
        entityType: "company",
        entityId: abcCompany.id,
        type: "note",
        summary: "Account strategy note captured",
        details: "Account owner flagged plant expansion as a cross-sell trigger.",
        nextFollowUp: addDays(new Date(), 3),
        createdBy: adminUser.id,
        createdAt: subDays(new Date(), 2),
      },
      {
        entityType: "company",
        entityId: xyzCompany.id,
        type: "whatsapp",
        summary: "Executive stakeholder follow-up sent",
        details: "Waiting on commercial proposal approval from finance.",
        nextFollowUp: subDays(new Date(), 2),
        createdBy: sarveshUser.id,
        createdAt: subDays(new Date(), 6),
      },
      {
        entityType: "opportunity",
        entityId: opp1.id,
        type: "email",
        summary: "Commercial proposal shared",
        details: "Sent proposal pack with pricing and rollout timeline.",
        nextFollowUp: addDays(new Date(), 2),
        createdBy: sagarUser.id,
        createdAt: subDays(new Date(), 2),
      },
      {
        entityType: "opportunity",
        entityId: opp2.id,
        type: "meeting",
        summary: "Negotiation review stalled",
        details: "Procurement requested revised commercials and has not responded for a week.",
        nextFollowUp: subDays(new Date(), 1),
        createdBy: sarveshUser.id,
        createdAt: subDays(new Date(), 7),
      },
      {
        entityType: "opportunity",
        entityId: opportunities[3]?.id || opp1.id,
        type: "call",
        summary: "Solution alignment call logged",
        details: "Technical and business owners confirmed deployment dependencies.",
        nextFollowUp: addDays(new Date(), 4),
        createdBy: adminUser.id,
        createdAt: subDays(new Date(), 3),
      },
    ],
  });

  await prisma.lead.update({
    where: { id: lead1.id },
    data: {
      lastActivityDate: subDays(new Date(), 1),
      nextFollowUpDate: addDays(new Date(), 1),
    },
  });

  await prisma.lead.update({
    where: { id: lead2.id },
    data: {
      lastActivityDate: subDays(new Date(), 8),
      nextFollowUpDate: subDays(new Date(), 1),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Follow-up with ABC",
        description: "Next touchpoint on safety training requirement.",
        assignedTo: sagarMember.name,
        entityType: "lead",
        entityId: lead1.id,
        dueDate: new Date(),
        status: "pending",
        priority: "high",
      },
      {
        title: "Demo with XYZ",
        description: "Schedule ESG solution walkthrough.",
        assignedTo: sarveshMember.name,
        entityType: "lead",
        entityId: lead2.id,
        dueDate: addDays(new Date(), 1),
        status: "pending",
        priority: "medium",
      },
      {
        title: "Prepare proposal summary",
        description: "Draft proposal summary for Aurora Stack.",
        assignedTo: sagarMember.name,
        entityType: "opportunity",
        entityId: opportunities[2]?.id || opp1.id,
        dueDate: addDays(new Date(), 2),
        status: "pending",
        priority: "medium",
      },
      {
        title: "Renewal check-in",
        description: "Review renewal timeline with Meridian Grid.",
        assignedTo: sarveshMember.name,
        entityType: "company",
        entityId: companyRecords[5]?.id || xyzCompany.id,
        dueDate: addDays(new Date(), 3),
        status: "pending",
        priority: "low",
      },
    ],
  });

  for (let index = 0; index < 3; index += 1) {
    const opportunity = opportunities.find((item) => item.stage === "Deal Won") || opportunities[index];
    if (!opportunity) continue;

    const order = await prisma.order.create({
      data: {
        orderId: `WO-${String(index + 1).padStart(3, "0")}`,
        companyId: opportunity.companyId,
        opportunityId: opportunity.id,
        productService: opportunity.productService,
        orderValue: opportunity.dealValue,
        currency: "USD",
        orderDate: subDays(new Date(), 10 - index),
        startDate: subDays(new Date(), 7 - index),
        completionDate: addDays(new Date(), 30 + index * 7),
        status: ["In Progress", "Kickoff", "Planning"][index],
        accountManager: opportunity.owner,
        notes: `Seeded order ${index + 1}`,
        advanceAmount: 15000 + index * 5000,
        amountPaid: 30000 + index * 10000,
        balanceAmount: Number(opportunity.dealValue) - (30000 + index * 10000),
        paymentStatus: index === 0 ? "Partial" : "Pending",
        invoiceNumber: `INV-${index + 1}`,
        paymentDueDate: addDays(new Date(), 12 + index * 5),
        renewalDate: addDays(new Date(), 365 - index * 15),
        renewalStatus: index === 0 ? "Pending" : "Active",
        implementation: {
          create: {
            implementationType: ["Hybrid", "Onsite", "Remote"][index],
            projectOwner: opportunity.owner,
            technicalLead: ["Daniel Brooks", "Aarav Kulkarni", "Mei Wong"][index],
            progress: [65, 28, 12][index],
            status: ["In Progress", "Kickoff", "Planning"][index],
          },
        },
        renewals: {
          create: {
            renewalDate: addDays(new Date(), 365 - index * 15),
            renewalValue: 18000 + index * 4000,
            contractDuration: "12 months",
            renewalType: index === 1 ? "Annual Renewal" : "AMC",
            status: index === 0 ? "Pending" : "Active",
            autoRenewal: index === 1,
          },
        },
        invoices: {
          create: {
            invoiceNumber: `INV-${index + 1}`,
            amount: 25000 + index * 5000,
            invoiceDate: subDays(new Date(), 3 + index),
            paymentStatus: index === 0 ? "Partial" : "Pending",
            fileUrl: `/uploads/invoice-${index + 1}.pdf`,
          },
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 12000 + index * 4000,
        paymentDate: subDays(new Date(), 1 + index),
        status: "Partial",
        receivedBy: opportunity.owner,
        reference: `WIRE-${index + 1}`,
      },
    });

    await prisma.document.create({
      data: {
        entityType: "order",
        entityId: order.id,
        fileName: `contract-${index + 1}.pdf`,
        fileUrl: `/uploads/contract-${index + 1}.pdf`,
        uploadedBy: opportunity.owner,
        fileType: "pdf",
      },
    });

    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Note",
        title: "Order created",
        description: `Seeded work order ${order.orderId}.`,
        createdBy: opportunity.owner,
        activityDate: subDays(new Date(), 2 + index),
      },
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const company = companyRecords[index];
    await prisma.demoTrial.create({
      data: {
        companyId: company.id,
        companyName: company.companyName,
        trialStart: subDays(new Date(), 25 - index * 2),
        trialEnd: addDays(new Date(), 5 + index * 4),
        accuracy: [78, 94, 88, 91][index],
        engagement: [65, 92, 78, 85][index],
        feedback: [3.5, 4.8, 4.2, 4.5][index],
        status: ["at-risk", "high", "moderate", "high"][index],
      },
    });
  }

  console.log("Seeding completed.");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
