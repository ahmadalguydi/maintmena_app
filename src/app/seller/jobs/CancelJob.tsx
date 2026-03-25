import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CancelJob = ({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="min-h-screen bg-paper flex flex-col pt-safe">
            <header className="px-5 py-4 flex items-center border-b border-border/40 bg-card">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
                    <ArrowLeft className="h-6 w-6 text-foreground" />
                </button>
                <h1 className="text-lg font-bold mx-auto pr-8">
                    {currentLanguage === 'ar' ? 'إلغاء المهمة' : 'Cancel Job'}
                </h1>
            </header>
            <main className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-2">
                        {currentLanguage === 'ar' ? 'قريباً' : 'Coming Soon'}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-[250px]">
                        {currentLanguage === 'ar' ? 'نموذج إلغاء المهمة قيد التطوير.' : 'The job cancellation flow is currently under development.'}
                    </p>
                </div>
                <Button onClick={() => navigate(-1)} className="w-full max-w-sm h-12 rounded-xl mt-8">
                    {currentLanguage === 'ar' ? 'العودة' : 'Go Back'}
                </Button>
            </main>
        </div>
    );
};
