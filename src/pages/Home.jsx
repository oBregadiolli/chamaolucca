import HeroSection from '../components/landing/HeroSection';
import BenefitsSection from '../components/landing/BenefitsSection';
import DarkHighlightSection from '../components/landing/DarkHighlightSection';
import CategoriesSection from '../components/landing/CategoriesSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import { usePageTitle, DEFAULT_PAGE_TITLE } from '../hooks/usePageTitle';

export default function Home() {
  usePageTitle(DEFAULT_PAGE_TITLE);

  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <DarkHighlightSection />
      <CategoriesSection />
      <TestimonialsSection />
    </>
  );
}
