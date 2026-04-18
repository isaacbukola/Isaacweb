/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ExternalLink, 
  Instagram, 
  Mail, 
  Menu, 
  X, 
  Globe, 
  Layout, 
  Zap, 
  Shield, 
  Smartphone, 
  Code2,
  ChevronRight,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Settings,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { db } from './lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';

const initialProjects = [
  {
    title: "Ethereal Commerce",
    category: "E-commerce",
    linkUrl: "https://ethereal-commerce.com",
    description: "A high-end fashion marketplace with seamless transitions.",
    tags: ["React", "Motion", "Tailwind"]
  },
  {
    title: "Nexus Dashboard",
    category: "SaaS",
    linkUrl: "https://nexus-dashboard.io",
    description: "Real-time analytics for modern enterprises.",
    tags: ["TypeScript", "D3.js"]
  },
  {
    title: "Aura Wellness",
    category: "Lifestyle",
    linkUrl: "https://aura-wellness.app",
    description: "Meditation app with atmospheric design.",
    tags: ["Mobile", "UI/UX"]
  }
];

const services = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Custom Web Development",
    description: "Building bespoke, high-performance websites from scratch tailored to your unique business needs."
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Maintenance & Fixing",
    description: "Expert troubleshooting, bug fixing, and regular maintenance to keep your site running perfectly."
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Responsive Redesign",
    description: "Modernizing outdated websites to look stunning and function flawlessly on all mobile and desktop devices."
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "SEO & Security",
    description: "Optimizing your site for search engines and implementing robust security patches to protect your data."
  },
  {
    icon: <Layout className="w-6 h-6" />,
    title: "CMS & E-commerce",
    description: "Setting up and managing WordPress, Shopify, and custom stores with secure payment integrations."
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "Technical Support",
    description: "Providing reliable hosting setup, domain management, and ongoing technical assistance."
  }
];

export default function App() {
  const [view, setView] = useState<'home' | 'portfolio'>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [aboutContent, setAboutContent] = useState({
    badge: 'The Philosophy',
    title: 'Design that works as good as it looks.',
    description: 'I strip away the noise to focus on what truly matters: your message and your users. Every pixel has a purpose. My approach combines technical precision with artistic intuition.',
    image: 'https://picsum.photos/seed/profile/800/800'
  });
  const [aboutForm, setAboutForm] = useState(aboutContent);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);

  // Fetch Data from Firebase
  useEffect(() => {
    // 1. Fetch About Content
    const aboutDocRef = doc(db, 'settings', 'about');
    const unsubscribeAbout = onSnapshot(aboutDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setAboutContent(data);
        setAboutForm(data);
      } else {
        // Initialize with default content if it doesn't exist
        const defaultAbout = {
          badge: 'The Philosophy',
          title: 'Design that works as good as it looks.',
          description: 'I strip away the noise to focus on what truly matters: your message and your users. Every pixel has a purpose. My approach combines technical precision with artistic intuition.',
          image: 'https://picsum.photos/seed/profile/800/800'
        };
        await setDoc(aboutDocRef, defaultAbout);
      }
    });

    // 2. Fetch Projects
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, orderBy('order', 'asc'));
    const unsubscribeProjects = onSnapshot(q, (querySnapshot) => {
      const fetchedProjects: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProjects.push({ id: doc.id, ...doc.data() });
      });
      
      if (fetchedProjects.length === 0 && isLoading) {
        // Initialize with local projects if DB is empty (first time only)
        initialProjects.forEach(async (p, index) => {
          await addDoc(collection(db, 'projects'), { ...p, order: index });
        });
      } else {
        setPortfolioProjects(fetchedProjects);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAbout();
      unsubscribeProjects();
    };
  }, [isLoading]);
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: '',
    linkUrl: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const scrollToSection = (sectionId: string) => {
    if (view !== 'home') {
      setView('home');
      // Wait for the view to switch before searching for the element
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleProjectClick = (project: any) => {
    if (project.linkUrl) {
      window.open(project.linkUrl, '_blank');
    }
  };

  const handleLogoClick = () => {
    const newCount = logoTapCount + 1;
    setLogoTapCount(newCount);
    
    if (newCount === 3) {
      setShowPasswordModal(true);
      setLogoTapCount(0);
    }

    // Reset count after 1 second of inactivity
    setTimeout(() => {
      setLogoTapCount(0);
    }, 1000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'idowubbb123') {
      setIsAdmin(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setAdminError('');
    } else {
      setAdminError('Incorrect password');
    }
  };

  const handleAddProject = () => {
    setEditingProjectIndex(null);
    setProjectForm({
      title: '',
      category: '',
      linkUrl: '',
      description: '',
      tags: ''
    });
    setShowProjectModal(true);
  };

  const handleEditProject = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const project = portfolioProjects[index];
    setEditingProjectIndex(index);
    setProjectForm({
      title: project.title,
      category: project.category,
      linkUrl: project.linkUrl || '',
      description: project.description,
      tags: project.tags.join(', ')
    });
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      const project = portfolioProjects[index];
      if (project.id) {
        await deleteDoc(doc(db, 'projects', project.id));
      }
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = projectForm.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    const projectData = {
      ...projectForm,
      tags: tagsArray,
      order: editingProjectIndex !== null ? portfolioProjects[editingProjectIndex].order : Date.now()
    };

    if (editingProjectIndex !== null) {
      const project = portfolioProjects[editingProjectIndex];
      await setDoc(doc(db, 'projects', project.id), projectData);
    } else {
      await addDoc(collection(db, 'projects'), projectData);
    }
    setShowProjectModal(false);
  };

  const handleAboutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'settings', 'about'), aboutForm);
    setShowAboutModal(false);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formData = new FormData(e.currentTarget);
    const accessKey = "cc550739-6cf6-4392-80f2-bdd06c47bf8a";
    formData.append("access_key", accessKey);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        (e.target as HTMLFormElement).reset();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-white selection:text-black overflow-x-hidden bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-24">
        {/* Navigation */}
        <nav className="w-full z-50">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleLogoClick}
              className="text-2xl font-heading font-extrabold tracking-tighter flex items-center gap-2 cursor-pointer select-none text-white"
            >
              <div className="w-2.5 h-2.5 bg-primary rounded-full" />
              ISAAC
            </motion.div>

            <div className="hidden md:flex items-center gap-10">
              {['Work', 'About', 'Services', 'Contact'].map((item) => (
                <button 
                  key={item} 
                  onClick={() => {
                    if (item === 'Work') setView('portfolio');
                    else scrollToSection(item.toLowerCase());
                  }}
                  className={`text-[14px] font-medium transition-colors hover:text-primary ${
                    (item === 'Work' && view === 'portfolio') || (item !== 'Work' && view === 'home') 
                    ? 'text-white' 
                    : 'text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
              <Button 
                onClick={() => setView('portfolio')}
                className="rounded-full px-6 h-10 text-[13px] font-bold"
              >
                Get Started
              </Button>
            </div>

            <div className="md:hidden">
              <Sheet>
                <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                  <Menu className="w-6 h-6" />
                </SheetTrigger>
                <SheetContent className="bg-[#0A0A0A] border-white/10">
                  <div className="flex flex-col gap-6 mt-12">
                    {['Work', 'About', 'Services', 'Contact'].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => {
                          if (item === 'Work') setView('portfolio');
                          else scrollToSection(item.toLowerCase());
                        }}
                        className="text-2xl font-heading font-semibold text-left text-white hover:text-white/60 transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-24"
            >
              {/* Hero Section */}
              <section className="min-h-[70vh] flex flex-col justify-center items-center text-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="max-w-4xl"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-white/60 text-[10px] font-bold mb-10 border border-white/10 uppercase tracking-widest">
                    <Zap className="w-3 h-3 text-white" />
                    <span>Website Specialist & UI Designer</span>
                  </div>
                  <h1 className="text-6xl md:text-8xl font-heading font-bold leading-[0.9] tracking-[-0.05em] mb-10">
                    Building the <span className="text-white/40 italic">future</span> of the web.
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
                    Minimalist aesthetics meets high-performance engineering. I create digital experiences that command attention.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button 
                      onClick={() => setView('portfolio')}
                      className="rounded-full px-10 h-14 text-[14px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                    >
                      View Projects
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                      className="rounded-full px-10 h-14 text-[14px] font-bold uppercase tracking-widest border-white/10 hover:bg-white/5 w-full sm:w-auto"
                    >
                      Get in Touch
                    </Button>
                  </div>
                </motion.div>
              </section>

              {/* Bento Grid Portfolio Preview */}
              <section id="work" className="scroll-mt-24">
                <div className="flex justify-between items-end mb-12">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-4xl font-heading font-bold tracking-tighter">Selected Work</h2>
                    <p className="text-muted-foreground">A glimpse into my latest digital creations.</p>
                  </div>
                  <button 
                    onClick={() => setView('portfolio')}
                    className="text-[13px] font-bold uppercase tracking-widest text-white hover:opacity-70 transition-opacity"
                  >
                    View All Projects
                  </button>
                </div>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="flex flex-col border-t border-white/10"
                >
                  {portfolioProjects.slice(0, 5).map((project, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      onClick={() => handleProjectClick(project)}
                      className="group flex flex-col md:flex-row md:items-center justify-between py-8 px-4 md:px-8 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer relative"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-1">
                          {project.category}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold tracking-tight group-hover:pl-2 transition-all duration-300 flex items-center gap-4">
                          {project.title}
                          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 text-white/40" />
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4 md:mt-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        {project.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] font-medium uppercase tracking-[0.1em]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              {/* Services Section */}
              <section id="services" className="scroll-mt-24">
                <div className="flex flex-col items-center text-center mb-16">
                  <h2 className="text-4xl font-heading font-bold tracking-tighter mb-4">Expertise</h2>
                  <p className="text-muted-foreground max-w-lg">
                    Comprehensive solutions for modern digital challenges.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="readdy-card p-8 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform border border-white/10">
                        {service.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-3 tracking-tight">{service.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* About Section */}
              <section id="about" className="scroll-mt-24 relative overflow-hidden rounded-[40px] bg-white/5 border border-white/10 p-12 md:p-24 group/about">
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setAboutForm(aboutContent);
                      setShowAboutModal(true);
                    }}
                    className="absolute top-8 right-8 z-30 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl opacity-0 group-hover/about:opacity-100 transition-all hover:scale-110"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                  <div className="flex flex-col gap-8 max-w-2xl">
                    <Badge variant="outline" className="rounded-full px-4 py-1 border-white/10 text-white/60 uppercase tracking-widest text-[10px] font-bold w-fit">
                      {aboutContent.badge}
                    </Badge>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold tracking-tighter leading-[1.05]">
                      {aboutContent.title.split(' ').map((word, i) => (
                        word.toLowerCase() === 'works' || word.toLowerCase() === 'future' || word.toLowerCase() === 'extraordinary' ? 
                        <span key={i} className="text-white/40 italic mr-2">{word}</span> : <span key={i} className="mr-2">{word}</span>
                      ))}
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                      {aboutContent.description}
                    </p>
                    <div className="flex gap-4">
                      <Button 
                        onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
                        className="rounded-full bg-white text-black hover:bg-white/90 px-8 h-12 font-bold uppercase tracking-widest text-[12px]"
                      >
                        Our Story
                      </Button>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="flex justify-center lg:justify-end"
                  >
                    <div className="relative w-full max-w-[440px] aspect-square rounded-[40px] overflow-hidden border border-white/10 group shadow-2xl">
                      <img 
                        src={aboutContent.image} 
                        alt="Profile" 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Contact Section */}
              <section id="contact" className="scroll-mt-24 mb-12">
                <div className="grid md:grid-cols-2 gap-16 items-start">
                  <div className="flex flex-col gap-8">
                    <Badge variant="outline" className="rounded-full px-4 py-1 border-white/10 text-white/60 uppercase tracking-widest text-[10px] font-bold w-fit">
                      Get in Touch
                    </Badge>
                    <h2 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter leading-[1.05]">Let's build something <span className="text-white/40 italic">extraordinary</span>.</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Have a project in mind? I'd love to hear about it. Let's collaborate to create something that stands out in the digital landscape.
                    </p>
                    
                    <div className="grid gap-4 mt-4">
                      <div className="flex items-center gap-5 p-6 rounded-[32px] border border-white/10 bg-white/5 group hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Email</span>
                          <div className="text-lg font-bold">Isaacmason928@gmail.com</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 p-6 rounded-[32px] border border-white/10 bg-white/5 group hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Phone</span>
                          <div className="text-lg font-bold">08020805409</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 p-6 rounded-[32px] border border-white/10 bg-white/5 group hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Location</span>
                          <div className="text-lg font-bold">Lagos, Nigeria</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-6 p-10 rounded-[40px] bg-white/5 border border-white/10 relative backdrop-blur-xl">
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 ml-1">Name</label>
                          <Input name="name" required placeholder="Your Name" className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20 focus:border-white/40 transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 ml-1">Email</label>
                          <Input name="email" type="email" required placeholder="Your Email" className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20 focus:border-white/40 transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 ml-1">Message</label>
                        <Textarea name="message" required placeholder="How can I help you?" className="rounded-2xl min-h-[160px] bg-white/5 border-white/10 p-6 text-white placeholder:text-white/20 focus:border-white/40 transition-colors" />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full h-14 rounded-2xl text-[14px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-all"
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>

                    <AnimatePresence>
                      {submitStatus === 'success' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-[40px] flex flex-center justify-center items-center p-8 text-center border border-white/10"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                              <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold">Message Sent!</h3>
                            <p className="text-sm text-muted-foreground">Thank you for reaching out. I'll get back to you shortly.</p>
                          </div>
                        </motion.div>
                      )}
                      {submitStatus === 'error' && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-[10px] font-bold text-center mt-2 uppercase tracking-widest"
                        >
                          Something went wrong. Please try again.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </section>
            </motion.div>
          ) : view === 'portfolio' ? (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setView('home')}
                    className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors group w-fit"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-1" /> Back to Home
                  </button>
                  <h1 className="text-6xl md:text-7xl font-heading font-bold tracking-tighter">Portfolio</h1>
                  <p className="text-muted-foreground max-w-xl text-lg">
                    A comprehensive collection of digital experiences, from high-end e-commerce to real-time SaaS dashboards.
                  </p>
                </div>
                {isAdmin && (
                  <Button 
                    onClick={handleAddProject}
                    className="rounded-full px-8 h-12 text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 bg-white text-black hover:bg-white/90"
                  >
                    <Plus className="w-4 h-4" /> Add Project
                  </Button>
                )}
              </div>

              {/* Full List */}
              <motion.div 
                layout
                className="flex flex-col border-t border-white/10"
              >
                <AnimatePresence mode="popLayout">
                  {portfolioProjects.map((project, index) => (
                    <motion.div
                      key={project.id || project.title + index}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => handleProjectClick(project)}
                      className="group flex flex-col md:flex-row md:items-center justify-between py-10 px-4 md:px-8 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer relative"
                    >
                      <div className="flex flex-col gap-2 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                            {project.category}
                          </div>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                            {new URL(project.linkUrl || 'https://example.com').hostname}
                          </div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold tracking-tighter group-hover:pl-4 transition-all duration-300 flex items-center gap-6">
                          {project.title}
                          <ArrowRight className="w-6 h-6 md:w-8 md:h-8 opacity-0 group-hover:opacity-100 -translate-x-8 group-hover:translate-x-0 transition-all duration-300 text-white/20" />
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          {project.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-8 mt-6 md:mt-0">
                        <div className="hidden lg:flex flex-wrap gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
                          {project.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-medium uppercase tracking-[0.2em] border border-white/10 rounded-full px-4 py-1.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => handleEditProject(e, index)}
                              className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteProject(e, index)}
                              className="w-12 h-12 rounded-full border border-white/10 bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Contact Strip / Footer */}
        <footer className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[14px] font-medium text-muted-foreground uppercase tracking-widest">Available for new projects — Q3 2024</span>
          </div>
          
          <div className="flex items-center gap-10">
            <a 
              href="https://www.instagram.com/ilog.icai/"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-bold uppercase tracking-widest cursor-pointer hover:text-white transition-colors text-white/40 flex items-center gap-2"
            >
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            {isAdmin && (
              <Button 
                variant="ghost"
                onClick={() => setIsAdmin(false)}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full px-6 h-10 font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]"
              >
                <Lock className="w-3 h-3" /> Logout
              </Button>
            )}
          </div>
        </footer>

        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPasswordModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#0A0A0A] rounded-[40px] p-12 w-full max-w-md shadow-2xl border border-white/10"
              >
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center text-white border border-white/10">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-heading font-bold tracking-tight text-white">Admin Access</h3>
                    <p className="text-muted-foreground">Enter password to enable edit mode.</p>
                  </div>
                  
                  <form onSubmit={handlePasswordSubmit} className="w-full space-y-6 mt-4">
                    <Input 
                      type="password" 
                      autoFocus
                      placeholder="Password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="rounded-2xl h-14 text-center text-xl tracking-[0.5em] font-bold bg-white/5 border-white/10 text-white placeholder:text-white/20"
                    />
                    {adminError && <p className="text-red-500 text-sm font-bold">{adminError}</p>}
                    <div className="flex gap-4">
                      <Button 
                        type="button"
                        variant="ghost"
                        onClick={() => setShowPasswordModal(false)}
                        className="flex-1 rounded-2xl h-14 font-bold text-white hover:bg-white/5"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="flex-1 rounded-2xl h-14 font-bold bg-white text-black hover:bg-white/90"
                      >
                        Unlock
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* About Modal */}
        <AnimatePresence>
          {showAboutModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAboutModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#0A0A0A] rounded-[40px] p-12 w-full max-w-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-heading font-bold tracking-tight text-white">Edit About Section</h3>
                  <button onClick={() => setShowAboutModal(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleAboutSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Badge Text</label>
                    <Input 
                      required
                      value={aboutForm.badge}
                      onChange={(e) => setAboutForm({...aboutForm, badge: e.target.value})}
                      placeholder="e.g. The Philosophy" 
                      className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Main Heading</label>
                    <Input 
                      required
                      value={aboutForm.title}
                      onChange={(e) => setAboutForm({...aboutForm, title: e.target.value})}
                      placeholder="Design that works as good as it looks." 
                      className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Description</label>
                    <Textarea 
                      required
                      value={aboutForm.description}
                      onChange={(e) => setAboutForm({...aboutForm, description: e.target.value})}
                      placeholder="Tell your story..." 
                      className="rounded-2xl min-h-[160px] bg-white/5 border-white/10 p-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Image URL</label>
                    <Input 
                      required
                      value={aboutForm.image}
                      onChange={(e) => setAboutForm({...aboutForm, image: e.target.value})}
                      placeholder="https://..." 
                      className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAboutModal(false)}
                      className="flex-1 rounded-2xl h-14 font-bold text-white hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1 rounded-2xl h-14 font-bold bg-white text-black hover:bg-white/90"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Project Modal */}
        <AnimatePresence>
          {showProjectModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProjectModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#0A0A0A] rounded-[40px] p-12 w-full max-w-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-heading font-bold tracking-tight text-white">
                    {editingProjectIndex !== null ? 'Edit Project' : 'Add New Project'}
                  </h3>
                  <button onClick={() => setShowProjectModal(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleProjectSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Title</label>
                      <Input 
                        required
                        value={projectForm.title}
                        onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                        placeholder="e.g. Nexus Dashboard" 
                        className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Category</label>
                      <Input 
                        required
                        value={projectForm.category}
                        onChange={(e) => setProjectForm({...projectForm, category: e.target.value})}
                        placeholder="e.g. SaaS" 
                        className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Live Website Link</label>
                    <Input 
                      required
                      value={projectForm.linkUrl}
                      onChange={(e) => setProjectForm({...projectForm, linkUrl: e.target.value})}
                      placeholder="https://yourwebsite.com" 
                      className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Description</label>
                    <Textarea 
                      required
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                      placeholder="Project overview..." 
                      className="rounded-2xl min-h-[140px] bg-white/5 border-white/10 p-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">Tags (comma separated)</label>
                    <Input 
                      value={projectForm.tags}
                      onChange={(e) => setProjectForm({...projectForm, tags: e.target.value})}
                      placeholder="React, Tailwind, Motion" 
                      className="rounded-2xl h-14 bg-white/5 border-white/10 px-6 text-white placeholder:text-white/20"
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setShowProjectModal(false)}
                      className="flex-1 rounded-2xl h-14 font-bold border-white/10 text-white hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1 rounded-2xl h-14 font-bold bg-white text-black hover:bg-white/90"
                    >
                      {editingProjectIndex !== null ? 'Save Changes' : 'Add Project'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
