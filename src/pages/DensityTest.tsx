import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const DensityTest = () => {
    const [density, setDensity] = useState<'compact' | 'default' | 'spacious'>('default');

    return (
        <div className="p-10 min-h-screen bg-gray-50 from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" data-density={density}>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Lean System: Density Prototype</h1>
                    <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border shadow-sm">
                        {(['compact', 'default', 'spacious'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setDensity(mode)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${density === mode
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>Project Alpha</CardTitle>
                                <Badge variant="default">Active</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                This card demonstrates the padding changes based on the density mode selected above.
                                Notice how the internal spacing expands and contracts.
                            </p>
                            <div className="mt-4 flex gap-2">
                                <Badge variant="secondary">Refactoring</Badge>
                                <Badge variant="outline">Priority: High</Badge>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button>View Details</Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Variable Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-muted p-4 rounded border">
                                <div>--card-padding:</div>
                                <div className="font-bold text-primary">
                                    {density === 'compact' ? '1rem' : density === 'spacious' ? '2rem' : '1.5rem'}
                                </div>
                                <div>--badge-px:</div>
                                <div className="font-bold text-primary">
                                    {density === 'compact' ? '0.5rem' : density === 'spacious' ? '0.75rem' : '0.625rem'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DensityTest;
