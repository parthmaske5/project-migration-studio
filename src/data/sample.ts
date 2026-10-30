import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";

export type Category = "tutors" | "materials" | "freelancers";

export const categories: { id: Category; label: string; anchor: string; placeholder: string }[] = [
  { id: "tutors", label: "Tutors", anchor: "tutors", placeholder: "Subject, level or tutor name…" },
  { id: "materials", label: "Learning Materials", anchor: "materials", placeholder: "Worksheets, notes, past-year papers…" },
  { id: "freelancers", label: "Freelancers", anchor: "freelancers", placeholder: "Design, editing, translation…" },
];

export const popularSearches = ["SPM Mathematics", "IGCSE Physics", "Bahasa Melayu", "UPSR English", "Essay editing", "Coding for kids"];

export type TeachingMode = "Online" | "In-person" | "Online & In-person";

export type Tutor = {
  id: string; name: string; photo?: string; qualification: string; subjects: string[];
  experience: string; years: number; mode: TeachingMode | ""; fee: number; location: string; levels: string[];
};

// Sample/demo profiles only — not real tutors.
export const tutors: Tutor[] = [
  { id: "nur-aisyah", name: "Nur Aisyah Rahman", photo: tutor1, qualification: "B.Ed. (Mathematics), UPSI", subjects: ["Mathematics", "Add Maths"], experience: "8 years", years: 8, mode: "Online & In-person", fee: 60, location: "Selangor", levels: ["Secondary (SPM)"] },
  { id: "daniel-tan", name: "Daniel Tan Wei Ming", photo: tutor2, qualification: "M.Sc. Physics, Universiti Malaya", subjects: ["Physics", "Chemistry"], experience: "15 years", years: 15, mode: "In-person", fee: 85, location: "Kuala Lumpur", levels: ["Secondary (SPM)", "IGCSE", "Pre-university"] },
  { id: "priya-s", name: "Priya Shanmugam", photo: tutor3, qualification: "B.A. English (TESL), UKM", subjects: ["English", "Literature"], experience: "5 years", years: 5, mode: "Online", fee: 50, location: "Penang", levels: ["Primary", "Lower Secondary"] },
  { id: "ahmad-faiz", name: "Ahmad Faiz Ismail", qualification: "B.Sc. Biology, USM", subjects: ["Biology", "Science"], experience: "6 years", years: 6, mode: "Online & In-person", fee: 55, location: "Johor", levels: ["Lower Secondary", "Secondary (SPM)"] },
  { id: "lim-jia-hui", name: "Lim Jia Hui", qualification: "B.A. Chinese Studies, UTAR", subjects: ["Mandarin"], experience: "4 years", years: 4, mode: "Online", fee: 40, location: "Perak", levels: ["Primary", "Lower Secondary"] },
  { id: "siti-hajar", name: "Siti Hajar Kamal", qualification: "B.Ed. (Bahasa Melayu), UPM", subjects: ["Bahasa Melayu", "Sejarah"], experience: "10 years", years: 10, mode: "In-person", fee: 70, location: "Sabah", levels: ["Primary", "Secondary (SPM)"] },
];

export const featuredTutors = tutors.slice(0, 3);
export const malaysianLocations = ["Johor","Kedah","Kelantan","Kuala Lumpur","Melaka","Negeri Sembilan","Pahang","Penang","Perak","Perlis","Putrajaya","Sabah","Sarawak","Selangor","Terengganu","Labuan"];
export const studentLevels = ["Primary", "Lower Secondary", "Secondary (SPM)", "IGCSE", "Pre-university"];

export const materials = [
  { title: "SPM Add Maths Formula Pack", subject: "Additional Mathematics", grade: "Form 4–5", creator: "Cikgu Hafiz", price: 15, tone: "bg-mint", emoji: "∑" },
  { title: "Year 4 Science Worksheets", subject: "Science", grade: "Year 4", creator: "Ms. Lim Mei Ling", price: 12, tone: "bg-sky", emoji: "🔬" },
  { title: "Karangan BM Templates", subject: "Bahasa Melayu", grade: "Form 1–3", creator: "Puan Zarina", price: 9, tone: "bg-peach", emoji: "✍️" },
  { title: "IGCSE Chemistry Revision Notes", subject: "Chemistry", grade: "IGCSE", creator: "Mr. Arjun Nair", price: 25, tone: "bg-butter", emoji: "⚗️" },
];

export const services = [
  { title: "Educational slide design", freelancer: "Farah Design Studio", description: "Clean, engaging slide decks for lessons and workshops.", from: 80, tone: "bg-rose", emoji: "🎨" },
  { title: "Academic proofreading", freelancer: "Kevin Ong", description: "Grammar, clarity and structure checks for essays and theses.", from: 50, tone: "bg-sky", emoji: "📝" },
  { title: "Explainer video editing", freelancer: "Amir Hakim", description: "Short, captioned teaching videos ready for any platform.", from: 150, tone: "bg-mint", emoji: "🎬" },
  { title: "BM–English translation", freelancer: "Siti Nadia", description: "Accurate translation of worksheets, notes and documents.", from: 40, tone: "bg-butter", emoji: "🌏" },
];

export const faqs = [
  { group: "Tutors", q: "How do I choose the right tutor?", a: "Filter by subject, level, teaching mode and fee, then review each tutor's qualifications and experience on their profile before contacting them." },
  { group: "Tutors", q: "Are lessons online or in-person?", a: "Both. Each tutor lists their teaching mode — online, in-person, or both — on their card and profile." },
  { group: "Resources", q: "What kinds of learning materials are available?", a: "Worksheets, revision notes, templates, past-year style practice and more, created by educators and organised by subject and grade." },
  { group: "Membership", q: "What does the RM20/month membership include?", a: "Membership gives you access to all resources marked as eligible for membership. Some premium or individually priced resources may not be included — eligibility is shown on each item." },
  { group: "Membership", q: "Can I cancel my membership?", a: "Yes, you can cancel anytime. Your access continues until the end of your current billing month." },
  { group: "Providers", q: "How do I become a provider?", a: "Click “Sign up as an Educator”, create your account, complete your profile and submit it for review." },
];
