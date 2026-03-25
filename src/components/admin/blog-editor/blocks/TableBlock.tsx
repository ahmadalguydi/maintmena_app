import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Block } from '../types';

interface TableBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const TableBlock = ({ block, onUpdate }: TableBlockProps) => {
  const headers = block.content.headers || ['Header 1', 'Header 2'];
  const rows = block.content.rows || [['Cell 1', 'Cell 2'], ['Cell 3', 'Cell 4']];

  const addRow = () => {
    const newRows = [...rows, Array(headers.length).fill('')];
    onUpdate({ rows: newRows });
  };

  const deleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    onUpdate({ rows: newRows });
  };

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map(row => [...row, '']);
    onUpdate({ headers: newHeaders, rows: newRows });
  };

  const deleteColumn = (index: number) => {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== index);
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    onUpdate({ headers: newHeaders, rows: newRows });
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    onUpdate({ headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    onUpdate({ rows: newRows });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((header, colIndex) => (
                <th key={colIndex} className="border border-border p-2 relative group">
                  <Input
                    value={header}
                    onChange={(e) => updateHeader(colIndex, e.target.value)}
                    className="font-semibold text-center border-0 bg-transparent"
                  />
                  {headers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteColumn(colIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-border p-2">
                    <Input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="border-0 bg-transparent"
                    />
                  </td>
                ))}
                <td className="border-0 pl-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteRow(rowIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-1" /> Add Column
        </Button>
      </div>
    </div>
  );
};
