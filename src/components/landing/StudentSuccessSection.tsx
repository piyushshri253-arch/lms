'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const StudentSuccessSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      id: 't-1',
      name: 'Maya Lin',
      role: 'Staff Design Systems Architect',
      company: 'Scale AI',
      transition: 'Promoted to Staff Lead',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA6go6huVNcSmSp4GDBh5zxs9F-7u4bbwFV4_Z354hWyqEq3keUQdIhOnw0rnBCiEhDx08yts1a7p4OiSO5qFmKSFrT6yPE-2j01kdPVcftjPvI-IZ2h6C-KVRPB9BrX_oPeTp_s1_VCRW4ybt6VXON4FFOirMdFXpwhXpe_EJY6Zd7a4e_ro6a2dkJmeSjEBMVj1mS8mF1SDuKg-7QULUyvUhcOcbujuoi_5xorDen64iDcFk7DiQ22Q',
      quote:
        '“The breakdown of design tokens and spatial cognition saved me months of trial and error. The capstone project directly helped me clear our company’s senior design system promotion.”',
      course: 'UI/UX Design Masterclass'
    },
    {
      id: 't-2',
      name: 'Julian Hayes',
      role: 'Principal Distributed Systems Engineer',
      company: 'Datadog',
      transition: 'Landed $240k Principal Role',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBnUOQAIWgHlv8K4gx6OUWk8S8ulEKlq00Dpl6NrYPKr2ShkxFzBQca9zKSU8oRuywYaTGEIJUD0fp56GjeB0EyLCE1I3_7wNjSudu66jfy239Ml2ZyynC4vD6eAOHdstwkWVthOc3L7GK2C-rbFCpWb8QfYdO4r8DwTtXQR5jhZPMyfL4DJmE1uPHnnpbC0l9CWWnfw8_XQmfioVHKqTGD-KDQVZBAG84TS3AB4eV3lX-E10vWDxsLvA',
      quote:
        '“The teaching methodology doesn’t shy away from hard mathematical consensus and distributed concurrency. You write the code, break it in production simulations, and fix it with the instructor.”',
      course: 'Full-Stack System Architecture'
    },
    {
      id: 't-3',
      name: 'Sara Kovač',
      role: 'Senior Full-Stack Developer',
      company: 'Airbnb',
      transition: 'Mastered Server Components',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDoFp1eGreTcQey2rw2vDSmyE9aflnOmqG-crHKiWwH45vzG_urMXpKbamcO2FcEjqZAi5izN1rjayugOQY27KHt8M-sZRukHX7p4choT3q8pRGjUn1Xtp2XrUKPDGc0W5FbLtMZQmkRNcqVIyfcFXXKRJGct2tRUuyrKWOJRuPBYHK-O9NV7Ytd5oQS3fMgzYUq30Or3FHs3uFrTzqn9jUzKTAS6yNaPLA3sRGV-udytprlKo6Ac8AUQ',
      quote:
        '“Next.js 15 Server Actions and streaming SSR were confusing until I took this curriculum. The verified diploma looks fantastic on my LinkedIn licenses section!”',
      course: 'Advanced React Patterns'
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.testimonial-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%'
        },
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="recommend" size={16} />
            <span>Proven Student Outcomes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
            Real Stories, Genuine Breakthroughs
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            See how active mentorship and project-backed masterclasses helped students accelerate their careers and build confidence.
          </p>
        </div>

        {/* 3 Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="testimonial-card bg-surface-container-lowest border border-outline-variant rounded-3xl p-7 sm:p-8 shadow-xs hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Stars & Transition Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Icon key={i} name="star" fill size={16} />
                    ))}
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                    {t.transition}
                  </span>
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-on-surface leading-relaxed italic">
                  {t.quote}
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-6 border-t border-outline-variant/60 flex items-center gap-3.5 mt-6">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{t.name}</h4>
                  <p className="text-xs text-on-surface-variant">{t.role} • {t.company}</p>
                  <span className="text-[11px] font-bold text-primary block mt-0.5">
                    Alum: {t.course}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
