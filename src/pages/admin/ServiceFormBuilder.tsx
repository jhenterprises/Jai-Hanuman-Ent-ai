import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ArrowLeft, Plus, Trash2, Save, Eye, GripVertical, Settings, Type, Hash, Calendar, List, AlignLeft, Upload, CheckSquare, CircleDot, Minus, Heading } from 'lucide-react';
import ModernButton from '../../components/ModernButton';

type Field = {
  id: string;
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  allowedFormats?: string[];
  maxSize?: number;
  conditionField?: string;
  conditionValue?: string;
};

type Section = {
  id: string;
  title: string;
  fields: Field[];
};

type FormSchema = {
  sections: Section[];
};

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'number', label: 'Number Input', icon: Hash },
  { type: 'date', label: 'Date Picker', icon: Calendar },
  { type: 'dropdown', label: 'Dropdown', icon: List },
  { type: 'textarea', label: 'Textarea', icon: AlignLeft },
  { type: 'file_upload', label: 'File Upload', icon: Upload },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: CircleDot },
  { type: 'divider', label: 'Section Divider', icon: Minus },
  { type: 'heading', label: 'Heading / Title', icon: Heading },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const ServiceFormBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  
  const [schema, setSchema] = useState<FormSchema>({
    sections: [{ id: generateId(), title: 'General Details', fields: [] }]
  });
  
  const [selectedField, setSelectedField] = useState<{ sectionId: string, fieldId: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Drag state
  const [draggedItem, setDraggedItem] = useState<{ type: 'new_field', fieldType: string } | { type: 'existing_field', sectionId: string, fieldIndex: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ sectionId: string, index: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const serviceRef = doc(db, 'services', id);
      const serviceSnap = await getDoc(serviceRef);
      
      if (serviceSnap.exists()) {
        const data = serviceSnap.data();
        setService({ id: serviceSnap.id, ...data });
        if (data.form_schema) {
          setSchema(data.form_schema);
        } else if (data.form_fields) {
          // Fallback if they were stored in form_fields array
          const sectionsMap: Record<string, Field[]> = {};
          data.form_fields.forEach((f: any) => {
            const secName = f.section_name || 'General Details';
            if (!sectionsMap[secName]) sectionsMap[secName] = [];
            sectionsMap[secName].push({
              id: generateId(),
              type: f.type,
              label: f.label,
              name: f.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              placeholder: f.placeholder,
              required: f.required === 1 || f.required === true,
              options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : []
            });
          });
          
          const newSections = Object.keys(sectionsMap).map(title => ({
            id: generateId(),
            title,
            fields: sectionsMap[title]
          }));
          setSchema({ sections: newSections });
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const serviceRef = doc(db, 'services', id);
      await updateDoc(serviceRef, { 
        form_schema: schema,
        updated_at: serverTimestamp()
      });
      alert('Form configuration saved successfully!');
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = () => {
    setSchema(prev => ({
      sections: [...prev.sections, { id: generateId(), title: 'New Section', fields: [] }]
    }));
  };

  const removeSection = (sectionId: string) => {
    setSchema(prev => ({
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    if (selectedSection === sectionId) setSelectedSection(null);
    if (selectedField?.sectionId === sectionId) setSelectedField(null);
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSchema(prev => ({
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, title } : s)
    }));
  };

  const handleDragStartNew = (e: React.DragEvent, fieldType: string) => {
    setDraggedItem({ type: 'new_field', fieldType });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartExisting = (e: React.DragEvent, sectionId: string, fieldIndex: number) => {
    setDraggedItem({ type: 'existing_field', sectionId, fieldIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItem?.type === 'new_field' ? 'copy' : 'move';
    setDragOverInfo({ sectionId, index });
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    setDragOverInfo(null);
    
    if (!draggedItem) return;

    setSchema(prev => {
      const newSections = JSON.parse(JSON.stringify(prev.sections)) as Section[];
      const targetSection = newSections.find(s => s.id === targetSectionId);
      if (!targetSection) return prev;

      if (draggedItem.type === 'new_field') {
        const newField: Field = {
          id: generateId(),
          type: draggedItem.fieldType,
          label: `New ${draggedItem.fieldType}`,
          name: `field_${generateId()}`,
          required: false,
          options: ['dropdown', 'radio'].includes(draggedItem.fieldType) ? ['Option 1', 'Option 2'] : undefined,
          allowedFormats: draggedItem.fieldType === 'file_upload' ? ['PDF', 'JPG', 'PNG'] : undefined,
          maxSize: draggedItem.fieldType === 'file_upload' ? 5 : undefined,
        };
        targetSection.fields.splice(targetIndex, 0, newField);
        setSelectedField({ sectionId: targetSectionId, fieldId: newField.id });
      } else if (draggedItem.type === 'existing_field') {
        const sourceSection = newSections.find(s => s.id === draggedItem.sectionId);
        if (!sourceSection) return prev;
        
        const [movedField] = sourceSection.fields.splice(draggedItem.fieldIndex, 1);
        
        // Adjust target index if dropping in the same section and after the removed item
        let adjustedTargetIndex = targetIndex;
        if (draggedItem.sectionId === targetSectionId && draggedItem.fieldIndex < targetIndex) {
          adjustedTargetIndex--;
        }
        
        targetSection.fields.splice(adjustedTargetIndex, 0, movedField);
      }
      
      return { sections: newSections };
    });
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverInfo(null);
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<Field>) => {
    setSchema(prev => ({
      sections: prev.sections.map(s => s.id === sectionId ? {
        ...s,
        fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
      } : s)
    }));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSchema(prev => ({
      sections: prev.sections.map(s => s.id === sectionId ? {
        ...s,
        fields: s.fields.filter(f => f.id !== fieldId)
      } : s)
    }));
    if (selectedField?.fieldId === fieldId) setSelectedField(null);
  };

  const duplicateField = (sectionId: string, fieldIndex: number) => {
    setSchema(prev => {
      const newSections = JSON.parse(JSON.stringify(prev.sections)) as Section[];
      const section = newSections.find(s => s.id === sectionId);
      if (section) {
        const fieldToDuplicate = section.fields[fieldIndex];
        const newField = { ...fieldToDuplicate, id: generateId(), name: `${fieldToDuplicate.name}_copy` };
        section.fields.splice(fieldIndex + 1, 0, newField);
      }
      return { sections: newSections };
    });
  };

  const getSelectedFieldData = () => {
    if (!selectedField) return null;
    const section = schema.sections.find(s => s.id === selectedField.sectionId);
    return section?.fields.find(f => f.id === selectedField.fieldId) || null;
  };

  const renderFieldInput = (field: Field) => {
    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return <input type={field.type} placeholder={field.placeholder} className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none" disabled />;
      case 'textarea':
        return <textarea placeholder={field.placeholder} className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none h-20" disabled />;
      case 'dropdown':
        return (
          <select className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none" disabled>
            <option>{field.placeholder || 'Select...'}</option>
            {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" disabled /> <span className="text-sm text-slate-600">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled /> <span className="text-sm text-slate-600">{field.label}</span>
          </label>
        );
      case 'file_upload':
        return (
          <div className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50">
            <Upload className="mx-auto text-slate-400 mb-2" size={20} />
            <p className="text-xs text-slate-500">Upload {field.allowedFormats?.join(', ')} (Max {field.maxSize}MB)</p>
          </div>
        );
      case 'divider':
        return <hr className="border-slate-200 my-4" />;
      case 'heading':
        return <h4 className="text-lg font-bold text-slate-800">{field.label}</h4>;
      default:
        return null;
    }
  };

  const renderPreview = () => {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="mb-8 pb-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{service?.service_name}</h2>
          <p className="text-slate-500">{service?.description}</p>
        </div>

        <div className="space-y-8">
          {schema.sections.map(section => (
            <div key={section.id} className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">{section.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map(field => {
                  // Conditional logic check
                  if (field.conditionField && field.conditionValue) {
                    // In preview, we don't have actual state to evaluate conditions easily without a full form engine.
                    // We'll just show it with a note.
                  }

                  const isFullWidth = ['textarea', 'file_upload', 'divider', 'heading'].includes(field.type);
                  
                  return (
                    <div key={field.id} className={`space-y-2 ${isFullWidth ? 'md:col-span-2' : ''}`}>
                      {!['divider', 'heading', 'checkbox'].includes(field.type) && (
                        <label className="text-sm font-medium text-slate-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                      )}
                      
                      {field.conditionField && (
                        <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block mb-1">
                          Shows if {field.conditionField} = {field.conditionValue}
                        </div>
                      )}

                      {field.type === 'text' || field.type === 'number' || field.type === 'date' ? (
                        <input 
                          type={field.type} 
                          placeholder={field.placeholder} 
                          defaultValue={field.defaultValue}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                        />
                      ) : field.type === 'textarea' ? (
                        <textarea 
                          placeholder={field.placeholder} 
                          defaultValue={field.defaultValue}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-24 resize-none" 
                        />
                      ) : field.type === 'dropdown' ? (
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                          <option value="">{field.placeholder || 'Select...'}</option>
                          {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="space-y-2">
                          {field.options?.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2">
                              <input type="radio" name={field.name} value={opt} /> <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name={field.name} /> <span className="text-sm font-medium text-slate-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                        </label>
                      ) : field.type === 'file_upload' ? (
                        <div className="w-full p-6 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                          <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                          <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-500 mt-1">{field.allowedFormats?.join(', ')} (Max {field.maxSize}MB)</p>
                        </div>
                      ) : field.type === 'divider' ? (
                        <hr className="border-slate-200 my-6" />
                      ) : field.type === 'heading' ? (
                        <h4 className="text-lg font-bold text-slate-800 mt-4">{field.label}</h4>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="pt-6 border-t border-slate-100">
            <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors w-full sm:w-auto">
              Submit Application
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  const selectedFieldData = getSelectedFieldData();

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/services')}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Form Builder</h1>
            <p className="text-slate-400 text-sm">Configuring: <span className="text-blue-400 font-medium">{service?.service_name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {isPreview ? <Settings size={16} /> : <Eye size={16} />}
            {isPreview ? 'Edit Mode' : 'Preview Form'}
          </button>
          {!isPreview && (
            <ModernButton 
              text={isSaving ? 'Saving...' : 'Save Form'} 
              icon={Save} 
              onClick={handleSave}
              disabled={isSaving}
            />
          )}
        </div>
      </div>

      {isPreview ? (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 rounded-2xl mt-4">
          {renderPreview()}
        </div>
      ) : (
        <div className="flex-1 flex gap-6 mt-4 min-h-0">
          {/* Left Panel: Field Types */}
          <div className="w-64 flex-none bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white text-sm">Form Elements</h3>
              <p className="text-xs text-slate-400 mt-1">Drag elements to the canvas</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {FIELD_TYPES.map(ft => (
                <div 
                  key={ft.type}
                  draggable
                  onDragStart={(e) => handleDragStartNew(e, ft.type)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-3 p-3 bg-black/20 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/30 rounded-xl cursor-grab active:cursor-grabbing transition-colors group"
                >
                  <div className="p-1.5 bg-white/5 rounded-lg text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10">
                    <ft.icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">{ft.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel: Canvas */}
          <div className="flex-1 bg-slate-50 rounded-2xl overflow-y-auto border border-slate-200 relative">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {schema.sections.map((section) => (
                <div 
                  key={section.id} 
                  className={`bg-white rounded-2xl border ${selectedSection === section.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} shadow-sm overflow-hidden transition-all`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between group">
                    <input 
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      className="font-bold text-lg text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-2 py-1 w-full max-w-sm"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-2 min-h-[100px]">
                    {section.fields.map((field, index) => {
                      const isSelected = selectedField?.fieldId === field.id;
                      const isDragOver = dragOverInfo?.sectionId === section.id && dragOverInfo?.index === index;
                      
                      return (
                        <React.Fragment key={field.id}>
                          {isDragOver && (
                            <div className="h-1 bg-blue-500 rounded-full my-2" />
                          )}
                          <div 
                            draggable
                            onDragStart={(e) => handleDragStartExisting(e, section.id, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, section.id, index)}
                            onDrop={(e) => handleDrop(e, section.id, index)}
                            onClick={(e) => { e.stopPropagation(); setSelectedField({ sectionId: section.id, fieldId: field.id }); }}
                            className={`group relative flex items-start gap-3 p-4 rounded-xl border ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-300'} transition-all cursor-pointer`}
                          >
                            <div className="mt-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500">
                              <GripVertical size={16} />
                            </div>
                            
                            <div className="flex-1 pointer-events-none">
                              {!['divider', 'heading'].includes(field.type) && (
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-700">{field.label}</span>
                                  {field.required && <span className="text-red-500 text-xs">*</span>}
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{field.type}</span>
                                </div>
                              )}
                              {renderFieldInput(field)}
                            </div>

                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-lg p-1 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); duplicateField(section.id, index); }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Duplicate"
                              >
                                <Plus size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeField(section.id, field.id); }}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Drop zone at the end of section */}
                    <div 
                      onDragOver={(e) => handleDragOver(e, section.id, section.fields.length)}
                      onDrop={(e) => handleDrop(e, section.id, section.fields.length)}
                      className={`h-12 rounded-xl border-2 border-dashed ${dragOverInfo?.sectionId === section.id && dragOverInfo?.index === section.fields.length ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'} flex items-center justify-center transition-all`}
                    >
                      {dragOverInfo?.sectionId === section.id && dragOverInfo?.index === section.fields.length ? (
                        <span className="text-xs font-bold text-blue-500">Drop here</span>
                      ) : section.fields.length === 0 ? (
                        <span className="text-xs text-slate-400">Drag fields here</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addSection}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add New Section
              </button>
            </div>
          </div>

          {/* Right Panel: Settings */}
          <div className="w-80 flex-none bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white text-sm">Field Settings</h3>
              <p className="text-xs text-slate-400 mt-1">Select a field to edit properties</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {!selectedFieldData ? (
                <div className="text-center text-slate-500 mt-10">
                  <Settings className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">Select a field in the canvas to edit its properties.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Label</label>
                    <input 
                      type="text" 
                      value={selectedFieldData.label}
                      onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { label: e.target.value })}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  {!['divider', 'heading'].includes(selectedFieldData.type) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Name (Key)</label>
                      <input 
                        type="text" 
                        value={selectedFieldData.name}
                        onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500">Used for API and data storage (no spaces)</p>
                    </div>
                  )}

                  {['text', 'number', 'textarea', 'dropdown'].includes(selectedFieldData.type) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placeholder</label>
                      <input 
                        type="text" 
                        value={selectedFieldData.placeholder || ''}
                        onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {['text', 'number', 'textarea'].includes(selectedFieldData.type) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Value</label>
                      <input 
                        type="text" 
                        value={selectedFieldData.defaultValue || ''}
                        onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { defaultValue: e.target.value })}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {['dropdown', 'radio'].includes(selectedFieldData.type) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Options</label>
                      <textarea 
                        value={selectedFieldData.options?.join('\n') || ''}
                        onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                        placeholder="One option per line"
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none h-32 resize-none"
                      />
                      <p className="text-[10px] text-slate-500">Enter one option per line</p>
                    </div>
                  )}

                  {selectedFieldData.type === 'file_upload' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allowed Formats</label>
                        <input 
                          type="text" 
                          value={selectedFieldData.allowedFormats?.join(', ') || ''}
                          onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { allowedFormats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="PDF, JPG, PNG"
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max File Size (MB)</label>
                        <input 
                          type="number" 
                          value={selectedFieldData.maxSize || 5}
                          onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { maxSize: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </>
                  )}

                  {!['divider', 'heading'].includes(selectedFieldData.type) && (
                    <div className="pt-4 border-t border-white/10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedFieldData.required}
                          onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { required: e.target.checked })}
                          className="w-4 h-4 rounded border-white/10 bg-black/20 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-sm font-medium text-white">Required Field</span>
                      </label>
                    </div>
                  )}

                  {/* Conditional Logic */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conditional Logic</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500">Show this field only if:</label>
                      <select 
                        value={selectedFieldData.conditionField || ''}
                        onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { conditionField: e.target.value })}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      >
                        <option value="">Always show</option>
                        {schema.sections.flatMap(s => s.fields)
                          .filter(f => f.id !== selectedFieldData.id && !['divider', 'heading'].includes(f.type))
                          .map(f => (
                            <option key={f.id} value={f.name}>{f.label} ({f.name})</option>
                          ))
                        }
                      </select>
                      
                      {selectedFieldData.conditionField && (
                        <input 
                          type="text" 
                          placeholder="Equals value..."
                          value={selectedFieldData.conditionValue || ''}
                          onChange={(e) => updateField(selectedField.sectionId, selectedField.fieldId, { conditionValue: e.target.value })}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-blue-500 outline-none mt-2"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceFormBuilder;
