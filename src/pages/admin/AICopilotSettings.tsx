import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Sparkles, Save, HelpCircle, FileText, Upload, Globe, MessageSquare, Power, ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../components/GlassCard';

interface AICopilotConfig {
  enabled: boolean;
  knowledgeBase: string;
  enableServiceSpecificGuidance: boolean;
  customResponses: {
    serviceUnavailable: string;
    greetings: string;
    unauthorized: string;
    externalLinkRestriction: string;
  };
  enableMultilingual: boolean;
  enableWelcomeMessage: boolean;
  welcomeMessage: string;
}

const DEFAULT_CONFIG: AICopilotConfig = {
  enabled: true,
  knowledgeBase: `# JH Digital Seva Kendra - Knowledge Base

## PAN Card Services
- **Required Documents**: Aadhaar Card, Passport size photo, Signature.
- **Workflow**: Step 1: Login. Step 2: Open "Apply for Services". Step 3: Choose "PAN Card". Step 4: Fill the application form, upload documents. Step 5: Pay the wallet fee. Step 6: Submit application.
- **Tracking**: Users can track their applications inside this portal in the "My Applications" tab using their Application ID.

## Aadhaar Services
- **Required Documents**: Identity & Address Proof (Aadhaar update requests require valid proofs).
- **Workflow**: Open Aadhaar Services, select "Aadhaar Demographic Update/Enquiry", submit document, process internally.

## Passport Services
- **Required Documents**: Age proof, Address proof, Matric Certificate (if applicable).
- **Workflow**: Choose Passport application form under "Apply for Services", input core passport slot booking info, upload document, and follow up in "My Applications".

## Voter ID & DL
- **Required Documents**: Age proof, photo, local address proof.
- **Workflow**: Apply internally via the dedicated form, and status is managed in "My Applications".
`,
  enableServiceSpecificGuidance: true,
  customResponses: {
    serviceUnavailable: 'This service is currently marked as Coming Soon. Please check back later.',
    greetings: 'Hello! I am your JH Digital Seva Kendra Portal Copilot. How can I help you today?',
    unauthorized: 'You do not have permission to view or use this service. Please contact your administrator.',
    externalLinkRestriction: 'To ensure maximum security and privacy, I only guide users through direct features inside the JH Digital Seva Kendra portal. I do not provide any external official links or third-party websites.'
  },
  enableMultilingual: true,
  enableWelcomeMessage: true,
  welcomeMessage: 'Hello! Welcome back to JH Digital Seva Kendra. I am your internal service Copilot. Ask me how to apply for PAN, Aadhaar, Voter ID, Passport, or track your application status.'
};

const AICopilotSettings: React.FC = () => {
  const [config, setConfig] = useState<AICopilotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'ai_copilot');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AICopilotConfig>;
        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          customResponses: {
            ...DEFAULT_CONFIG.customResponses,
            ...(data.customResponses || {})
          }
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching AI configuration:', err);
      toast.error('Failed to load AI Copilot settings');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'ai_copilot'), config, { merge: true });
      toast.success('AI Copilot settings saved successfully!');
    } catch (err) {
      console.error('Error saving AI settings:', err);
      toast.error('Failed to save AI Copilot settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('text/') && !file.name.endsWith('.md') && !file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
      toast.error('Only text or markdown files (.txt, .md, .json) are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setConfig(prev => ({
          ...prev,
          knowledgeBase: prev.knowledgeBase + '\n\n' + `### Added from ${file.name}\n` + text
        }));
        toast.success(`Successfully loaded and appended text from ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
      toast.error('Only text or markdown files (.txt, .md, .json) are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setConfig(prev => ({
          ...prev,
          knowledgeBase: prev.knowledgeBase + '\n\n' + `### Dragged from ${file.name}\n` + text
        }));
        toast.success(`Successfully loaded and appended from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-blue-500 animate-pulse" size={32} />
            AI <span className="text-blue-500">Copilot Settings</span>
          </h1>
          <p className="text-slate-500">Configure your internal portal smart assistant, custom response templates, and knowledge base.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs disabled:opacity-50"
        >
          {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Switches & Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Power className="text-blue-500" size={20} />
              <h2 className="text-lg font-bold text-white">General AI Behavior</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="space-y-0.5">
                  <span className="text-white font-bold text-sm block">Enable AI Copilot</span>
                  <span className="text-xs text-slate-400">Enable portal-wide support widget</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="space-y-0.5">
                  <span className="text-white font-bold text-sm block">Service-Specific Guidance</span>
                  <span className="text-xs text-slate-400">Explain document checklists & workflows</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableServiceSpecificGuidance}
                  onChange={(e) => setConfig({ ...config, enableServiceSpecificGuidance: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="space-y-0.5">
                  <span className="text-white font-bold text-sm block">Multilingual Support</span>
                  <span className="text-xs text-slate-400">Let assistant converse in Hindi/English/local dialect</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableMultilingual}
                  onChange={(e) => setConfig({ ...config, enableMultilingual: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="space-y-0.5">
                  <span className="text-white font-bold text-sm block">Enable Welcome Message</span>
                  <span className="text-xs text-slate-400">Greet user on opening AI chat first time</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableWelcomeMessage}
                  onChange={(e) => setConfig({ ...config, enableWelcomeMessage: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>
            </div>

            {config.enableWelcomeMessage && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Welcome Chat Greet</label>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  rows={2}
                  className="w-full p-4 bg-slate-900/40 border border-white/10 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Set custom welcoming words..."
                />
              </div>
            )}
          </GlassCard>

          {/* Response Customization */}
          <GlassCard className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <MessageSquare className="text-blue-500" size={20} />
              <h2 className="text-lg font-bold text-white">Customize AI Responses</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Unavailable Response</label>
                  <span className="text-[9px] text-zinc-500 font-bold">Triggered if a service is Coming Soon / offline</span>
                </div>
                <input
                  type="text"
                  value={config.customResponses.serviceUnavailable}
                  onChange={(e) => setConfig({
                    ...config,
                    customResponses: { ...config.customResponses, serviceUnavailable: e.target.value }
                  })}
                  className="w-full p-4 bg-slate-900/40 border border-white/10 rounded-2xl text-white font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">External Link Restriction Message</label>
                  <span className="text-[9px] text-zinc-500 font-bold">Triggered if user asks for official government or external websites</span>
                </div>
                <textarea
                  value={config.customResponses.externalLinkRestriction}
                  onChange={(e) => setConfig({
                    ...config,
                    customResponses: { ...config.customResponses, externalLinkRestriction: e.target.value }
                  })}
                  rows={3}
                  className="w-full p-4 bg-slate-900/40 border border-white/10 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unauthorized Notice Response</label>
                <input
                  type="text"
                  value={config.customResponses.unauthorized}
                  onChange={(e) => setConfig({
                    ...config,
                    customResponses: { ...config.customResponses, unauthorized: e.target.value }
                  })}
                  className="w-full p-4 bg-slate-900/40 border border-white/10 rounded-2xl text-white font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right column: Knowledge Base */}
        <div className="space-y-6">
          <GlassCard className="p-8 space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-500" size={20} />
                <h2 className="text-lg font-bold text-white">AI Knowledge Base</h2>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Use the text editor below to specify custom knowledge. The AI assistant relies on this base to answer procedural questions.
            </p>

            {/* Drag and Drop File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-slate-900/30 hover:bg-blue-500/5 p-6 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="text-slate-400 group-hover:text-blue-400 group-hover:scale-110 transition-all" size={28} />
              <p className="text-xs font-bold text-slate-300">Drag & Drop knowledge file here</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Supports .txt, .md, .json</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.json"
                className="hidden"
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Knowledge Document (Markdown)</label>
              <textarea
                value={config.knowledgeBase}
                onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
                className="w-full flex-1 p-4 bg-slate-900/60 border border-white/10 rounded-2xl text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[300px]"
                placeholder="Write custom markdown structure containing workflows, required documents..."
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AICopilotSettings;
