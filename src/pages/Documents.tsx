import React from 'react';
import DocumentManager from '../components/documents/DocumentManager';

export const Documents: React.FC = () => {
    return (
        <div className="h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                <div className="mb-6 flex-none">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Documents</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and organize all platform documents securely.</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                    <DocumentManager />
                </div>
            </div>
        </div>
    );
};

export default Documents;
