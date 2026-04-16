import React from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import ModernButton from '../components/ModernButton';

const Contact = () => {
  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-12 md:pt-32 md:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 leading-tight">
            Get in Touch
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 px-4">
            Have questions? We're here to help. Reach out to us through any of the channels below.
          </p>
        </div>
      </header>

      {/* Contact Info & Form */}
      <section className="py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
            {/* Contact Info */}
            <div className="space-y-8 md:space-y-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-slate-900 dark:text-white">Contact Information</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-10 text-sm md:text-base leading-relaxed">Our team is available to assist you during business hours. Feel free to visit our office or contact us online.</p>
                
                <div className="space-y-6 md:space-y-8">
                  {[
                    { icon: MapPin, title: 'Our Office', desc: '123 Digital Seva Road, Main Market,\nBangalore, Karnataka - 560001' },
                    { icon: Mail, title: 'Email Us', desc: 'support@jhdigitalseva.com\ninfo@jhdigitalseva.com' },
                    { icon: Phone, title: 'Call Us', desc: '+91 98765 43210\n+91 80 1234 5678' },
                    { icon: Clock, title: 'Business Hours', desc: 'Mon - Sat: 09:00 AM - 07:00 PM\nSunday: Closed' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 md:gap-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 shrink-0">
                        <item.icon size={20} className="sm:size-6" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold mb-1 text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm md:text-base whitespace-pre-line leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                <MessageSquare className="text-blue-600 dark:text-blue-500 sm:size-6" size={20} />
                Send us a Message
              </h2>
              <form className="space-y-5 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      className="w-full px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Subject</label>
                  <input 
                    type="text" 
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Message</label>
                  <textarea 
                    placeholder="Your message here..."
                    className="w-full px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all h-32 md:h-40 resize-none text-sm md:text-base"
                  />
                </div>
                <ModernButton 
                  text="Send Message" 
                  icon={Send} 
                  type="submit"
                  gradient="blue-gold-gradient"
                  className="w-full !py-3.5 md:!py-5 text-sm sm:text-base md:text-lg"
                />
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
