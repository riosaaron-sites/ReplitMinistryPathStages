import { db } from "./db";
import { ministries, trainingModules } from "@shared/schema";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const coreMinistries = [
  { id: "92ff9fc5-91d1-4160-a21d-0e17e66d71b6", name: "Board of Elders", slug: "board-of-elders", category: "leadership", description: "Church board members and elders" },
  { id: "3033d1bb-6ec5-4036-b586-95b77829473a", name: "CORE Ministry", slug: "core-ministry", category: "Leadership", description: "Core ministry leadership and administration" },
  { id: "cf66a53c-8f12-4946-8137-58ade2402214", name: "CREW Ministry", slug: "crew-ministry", category: "hospitality", description: "Service and hospitality crew" },
  { id: "036ef00d-175c-40bd-97da-fb14c390038e", name: "Counting Ministry", slug: "counting-ministry", category: "operations", description: "Financial counting and stewardship team" },
  { id: "2adeca2f-e5b6-4932-b603-5cf70e796fa6", name: "Facilities Ministry", slug: "facilities-ministry", category: "Operations", description: "Building maintenance, setup, and cleaning ministry" },
  { id: "eab5c623-88f8-45f8-af8b-4c55c2b75275", name: "Media Ministry", slug: "media-ministry", category: "production", description: "Media production and communications" },
  { id: "306d3fa9-b6f8-4b28-adce-907fdedd1633", name: "Prayer Team", slug: "prayer-team", category: "Prayer", description: "Pray for the church and individuals." },
  { id: "7f8af4bf-6183-4799-b6f5-832991ac2513", name: "Security Ministry", slug: "security-ministry", category: "operations", description: "Church safety and security team" },
  { id: "dbba4262-88f7-4be2-966f-7d298c457f30", name: "Service Coordinator Ministry", slug: "service-coordinator", category: "operations", description: "Service coordination and planning" },
  { id: "94f28612-788f-4952-ac01-19e04a151cac", name: "Worship Team", slug: "worship-team", category: "Worship Arts", description: "Lead the congregation in musical worship through vocals and instruments." },
  { id: "816e11a0-480f-41ff-8628-3c2897a9402f", name: "Welcome Team", slug: "welcome-team", category: "First Impressions", description: "Welcome guests and help them feel at home." },
  { id: "00fcad0b-ce21-4fb1-83ac-394f6df06677", name: "Youth Ministry", slug: "youth-ministry", category: "Next Gen", description: "Mentor and disciple teenagers through engaging programs." },
  { id: "29f8d9f6-75a3-4b63-be29-233a5073ce9b", name: "Tech Team", slug: "tech-team", category: "Media / Production", description: "Run sound, lights, and livestream for services." },
  { id: "6cb3b68e-cd4b-494a-9824-6aa811e0eeb2", name: "Landing Team", slug: "landing-team", category: "hospitality", description: "First impressions and hospitality ministry - ensuring every guest feels welcomed" },
  { id: "cf7b13eb-f4df-41dc-9e67-e41e51921c3d", name: "Worship Arts", slug: "worship-arts", category: "worship", description: "Leading the congregation in musical worship and creative arts" },
];

const coreTrainingModules = [
  { id: "cbb23752-ae27-4f76-a9e6-b4f569367846", title: "About Us & Our Mission", description: "Deep training module based on the About Us Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "all" as const, isRequired: false, estimatedMinutes: 100, xpReward: 200 },
  { id: "3e9388f5-aa53-467a-b29d-16de5a0f9318", title: "Auxiliary Ministry Training", description: "Deep training module based on the Auxiliary Ministry Manual manual. This comprehensive training includes 4 lessons, knowledge checks, and scenario-based assessments.", ministryId: "6cb3b68e-cd4b-494a-9824-6aa811e0eeb2", audience: "ministry" as const, isRequired: true, estimatedMinutes: 60, xpReward: 200 },
  { id: "f6d2efb7-64c4-479d-a8a6-0577a9d078e3", title: "Baptism Handout", description: "Deep training module based on the Baptism Handout manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "all" as const, isRequired: false, estimatedMinutes: 100, xpReward: 200 },
  { id: "129c955c-9b37-473b-a478-627126949ed1", title: "Board Member Guide", description: "Deep training module based on the Board Member Guide manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "92ff9fc5-91d1-4160-a21d-0e17e66d71b6", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "0347ec35-1d71-404f-9266-73d612c45cc3", title: "Board Member Instruction Guide", description: "Deep training module based on the Board Member Instruction Guide manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "92ff9fc5-91d1-4160-a21d-0e17e66d71b6", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "c1905e15-ea2c-4454-90d5-ad52b03114ba", title: "CORE Minister Training", description: "Deep training module based on the CORE Minister Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "3033d1bb-6ec5-4036-b586-95b77829473a", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "13996417-b560-46b7-a5c3-99691f862640", title: "CREW Training", description: "Deep training module based on the CREW Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "cf66a53c-8f12-4946-8137-58ade2402214", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "95611cbc-2b79-4e22-bd26-090996175538", title: "Celebrate Recovery Training", description: "Deep training module based on the Celebrate Recovery Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "306d3fa9-b6f8-4b28-adce-907fdedd1633", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "f795ab05-b4de-4ea4-b6a6-4678406a0bb9", title: "City Youth Ministry Training", description: "Deep training module based on the City UTH Manual manual. This comprehensive training includes 9 lessons, knowledge checks, and scenario-based assessments.", ministryId: "00fcad0b-ce21-4fb1-83ac-394f6df06677", audience: "ministry" as const, isRequired: true, estimatedMinutes: 110, xpReward: 200 },
  { id: "0b080cfb-f912-4f26-be19-7013b7fe56d4", title: "City Youth Worship Training", description: "Deep training module based on the City Youth Worship Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "cf7b13eb-f4df-41dc-9e67-e41e51921c3d", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "fb69401e-26a9-4d30-8144-ad3f54bebb66", title: "Counting Ministry Training", description: "Deep training module based on the Counting Ministry Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "036ef00d-175c-40bd-97da-fb14c390038e", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "c9603291-64b7-4541-9067-f7525daac2b4", title: "Discipleship Model", description: "Deep training module based on the Discipleship Model manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "4d6ebd70-576d-4eb4-bb5c-c2432540cbb1", title: "Discipleship Pathway", description: "Deep training module based on the Discipleship Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "078f2eb2-ede5-4d42-8f43-69993542eb67", title: "Employee Training", description: "Deep training module based on the Employee Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "ministry" as const, isRequired: false, estimatedMinutes: 100, xpReward: 200 },
  { id: "00f96863-eeec-4369-8d6c-e18cb9f059be", title: "Facilities Care and Purpose", description: "Deep training module based on the Live the life. Tell the Story. manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "2adeca2f-e5b6-4932-b603-5cf70e796fa6", audience: "all" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "a9a0778d-68e8-4968-a586-4397f2a56be9", title: "Facilities Ministry Training", description: "Deep training module based on the Facilities Ministry Manual manual. This comprehensive training includes 4 lessons, knowledge checks, and scenario-based assessments.", ministryId: "2adeca2f-e5b6-4932-b603-5cf70e796fa6", audience: "ministry" as const, isRequired: true, estimatedMinutes: 60, xpReward: 200 },
  { id: "e1e7e71f-b35b-4994-a426-1cae9936c1cf", title: "Following Jesus", description: "Deep training module based on the Following Jesus manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "all" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "7d7d30f2-9428-4986-98b4-06b7cc95a8c4", title: "Intercessory Prayer Training", description: "Deep training module based on the Intercessory Ministry Manual manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "306d3fa9-b6f8-4b28-adce-907fdedd1633", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "fa5ab586-1540-48d5-a6ba-f067947206e7", title: "Kingdom Children Training", description: "Deep training module based on the Kingdom Children Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "00fcad0b-ce21-4fb1-83ac-394f6df06677", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "e17f1a37-dabd-474d-afd4-9948b9d223c7", title: "Language of a Leader", description: "Deep training module based on the Language of a Leader manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "7f5551f1-2fef-4a30-990e-06bd7607f0c2", title: "Media Ministry Job Description", description: "Deep training module based on the Media Ministry Job Description manual. This comprehensive training includes 5 lessons, knowledge checks, and scenario-based assessments.", ministryId: "eab5c623-88f8-45f8-af8b-4c55c2b75275", audience: "ministry" as const, isRequired: true, estimatedMinutes: 70, xpReward: 200 },
  { id: "9aae008b-2644-4957-ae96-05891058699e", title: "Media Ministry Leader's Job Description", description: "Deep training module based on the Media Ministry Leader's Job Description manual. This comprehensive training includes 12 lessons, knowledge checks, and scenario-based assessments.", ministryId: "eab5c623-88f8-45f8-af8b-4c55c2b75275", audience: "leader" as const, isRequired: true, estimatedMinutes: 140, xpReward: 200 },
  { id: "b8867b0b-bcae-4298-b6b7-231793658ebb", title: "Ministry Development Questionnaire", description: "Deep training module based on the Ministry Development Questionnaire manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: false, estimatedMinutes: 100, xpReward: 200 },
  { id: "1809b375-0714-4c20-8132-d96c933d9bab", title: "Ministry Leaders Training", description: "Deep training module based on the Ministry Leaders Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "181b134b-5ca2-4e27-8a02-975fef2f3c97", title: "Recruitment 101", description: "Deep training module based on the Recruitment 101 manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: null, audience: "leader" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "4648fdc2-6c7d-465f-8e4a-575f11629cbd", title: "Security Ministry Training", description: "Deep training module based on the Security Ministry Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "7f8af4bf-6183-4799-b6f5-832991ac2513", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "3f01b99c-2bc5-4399-9fab-178484796a59", title: "Service Coordinator Job Description", description: "Deep training module based on the Service Coordinator Job Description manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "dbba4262-88f7-4be2-966f-7d298c457f30", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "b7dc4067-a38b-4066-9b59-08756f7f2fb0", title: "Social Media Ministry Training", description: "Deep training module based on the SOCIAL MEDIA MANUAL manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "29f8d9f6-75a3-4b63-be29-233a5073ce9b", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
  { id: "da29bef8-ceda-4cb8-a9c9-bb7481f467bc", title: "Usher Ministry Training", description: "Deep training module based on the Usher Ministry Manual manual. This comprehensive training includes 4 lessons, knowledge checks, and scenario-based assessments.", ministryId: "816e11a0-480f-41ff-8628-3c2897a9402f", audience: "ministry" as const, isRequired: true, estimatedMinutes: 60, xpReward: 200 },
  { id: "2e75dbe4-5e7c-4306-a6b3-15e22aca0b6d", title: "Worship Team Training", description: "Deep training module based on the Youth Worship Manual manual. This comprehensive training includes 8 lessons, knowledge checks, and scenario-based assessments.", ministryId: "94f28612-788f-4952-ac01-19e04a151cac", audience: "ministry" as const, isRequired: true, estimatedMinutes: 100, xpReward: 200 },
];

export async function seedCoreData() {
  console.log("[Seed] Checking for core ministries and training modules...");
  
  let ministriesAdded = 0;
  let ministriesSkipped = 0;
  let trainingsAdded = 0;
  let trainingsSkipped = 0;

  for (const ministry of coreMinistries) {
    try {
      const existing = await db.query.ministries.findFirst({
        where: (table, { eq }) => eq(table.id, ministry.id)
      });
      
      if (existing) {
        ministriesSkipped++;
        continue;
      }
      
      await db.insert(ministries).values({
        id: ministry.id,
        name: ministry.name,
        slug: ministry.slug,
        category: ministry.category,
        description: ministry.description,
        isActive: true,
        isArchived: false,
        canBeDeleted: true,
        sortOrder: 0,
      });
      
      ministriesAdded++;
      console.log(`[Seed] Added ministry: ${ministry.name}`);
    } catch (error) {
      console.error(`[Seed] Failed to add ministry "${ministry.name}":`, error);
    }
  }

  for (const training of coreTrainingModules) {
    try {
      const existing = await db.query.trainingModules.findFirst({
        where: (table, { eq }) => eq(table.id, training.id)
      });
      
      if (existing) {
        trainingsSkipped++;
        continue;
      }
      
      await db.insert(trainingModules).values({
        id: training.id,
        title: training.title,
        slug: slugify(training.title),
        description: training.description,
        ministryId: training.ministryId,
        audience: training.audience,
        isRequired: training.isRequired,
        isActive: true,
        estimatedMinutes: training.estimatedMinutes,
        xpReward: training.xpReward,
        requiresApproval: false,
        orderIndex: 0,
      });
      
      trainingsAdded++;
      console.log(`[Seed] Added training: ${training.title}`);
    } catch (error) {
      console.error(`[Seed] Failed to add training "${training.title}":`, error);
    }
  }
  
  console.log(`[Seed] Ministries: ${ministriesAdded} added, ${ministriesSkipped} already existed`);
  console.log(`[Seed] Trainings: ${trainingsAdded} added, ${trainingsSkipped} already existed`);
  
  return { ministriesAdded, ministriesSkipped, trainingsAdded, trainingsSkipped };
}
