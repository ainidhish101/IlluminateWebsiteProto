import type { Route } from "./+types/home";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Hero from "../components/home/Hero";
import Catalog from "../components/home/Catalog";
import WhyIlluminate from "../components/home/WhyIlluminate";
import FinalCta from "../components/home/FinalCta";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Illuminate — Free college & academic guidance for K–12 students" },
    {
      name: "description",
      content:
        "Illuminate is a student-led nonprofit helping K–12 students navigate academics, extracurriculars, testing, and college prep — completely free.",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Catalog />
        <WhyIlluminate />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
