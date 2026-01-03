import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureCanvas } from "./SignatureCanvas";
import { PenTool, Type, Upload } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: { type: "drawn" | "typed" | "uploaded"; data: string; full_name: string }) => Promise<void>;
  currentLanguage: "en" | "ar";
  defaultName?: string;
}

export function SignatureModal({ open, onClose, onSave, currentLanguage, defaultName = "" }: SignatureModalProps) {
  const [signatureType, setSignatureType] = useState<"drawn" | "typed" | "uploaded">("drawn");
  const [drawnSignature, setDrawnSignature] = useState("");
  const [typedName, setTypedName] = useState(defaultName);
  const [uploadedImage, setUploadedImage] = useState("");
  const [saving, setSaving] = useState(false);

  const content = {
    en: {
      title: "Create Your Legal Signature",
      description: "This signature will be used for all your contracts and stored securely in your profile.",
      draw: "Draw",
      type: "Type",
      upload: "Upload",
      typeName: "Type your full name",
      namePlaceholder: "Your full name",
      uploadImage: "Upload signature image",
      save: "Save Signature",
      cancel: "Cancel",
    },
    ar: {
      title: "إنشاء التوقيع القانوني",
      description: "سيتم استخدام هذا التوقيع لجميع عقودك وتخزينه بشكل آمن في ملفك الشخصي.",
      draw: "رسم",
      type: "كتابة",
      upload: "تحميل",
      typeName: "اكتب اسمك الكامل",
      namePlaceholder: "اسمك الكامل",
      uploadImage: "تحميل صورة التوقيع",
      save: "حفظ التوقيع",
      cancel: "إلغاء",
    },
  };

  const t = content[currentLanguage];

  const handleSave = async () => {
    setSaving(true);
    try {
      let data = "";
      let type = signatureType;
      let name = "";

      if (signatureType === "drawn" && drawnSignature) {
        data = drawnSignature;
        name = defaultName;
      } else if (signatureType === "typed" && typedName) {
        // Create a canvas with typed signature
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = '36px "Dancing Script", cursive';
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(typedName, 200, 50);
        }
        data = canvas.toDataURL();
        name = typedName;
      } else if (signatureType === "uploaded" && uploadedImage) {
        data = uploadedImage;
        name = defaultName;
      }

      if (data && name) {
        await onSave({ type, data, full_name: name });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="drawn">
              <PenTool className="w-4 h-4 mr-2" />
              {t.draw}
            </TabsTrigger>
            <TabsTrigger value="typed">
              <Type className="w-4 h-4 mr-2" />
              {t.type}
            </TabsTrigger>
            <TabsTrigger value="uploaded">
              <Upload className="w-4 h-4 mr-2" />
              {t.upload}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drawn" className="space-y-4">
            <SignatureCanvas
              onChange={(sig) => {
                setSignature(sig);
                setSignatureMethod("digital_canvas");
              }}
            />
          </TabsContent>

          <TabsContent value="typed" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-name">{t.typeName}</Label>
              <Input
                id="typed-name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="font-serif text-2xl"
              />
            </div>
            {typedName && (
              <div className="border rounded-lg p-8 bg-muted/20">
                <p className="text-4xl text-center" style={{ fontFamily: '"Dancing Script", cursive' }}>
                  {typedName}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="uploaded" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-upload">{t.uploadImage}</Label>
              <Input id="signature-upload" type="file" accept="image/*" onChange={handleFileUpload} />
            </div>
            {uploadedImage && (
              <div className="border rounded-lg p-4 bg-muted/20">
                <img src={uploadedImage} alt="Signature" className="max-h-32 mx-auto" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              (signatureType === "drawn" && !drawnSignature) ||
              (signatureType === "typed" && !typedName) ||
              (signatureType === "uploaded" && !uploadedImage)
            }
          >
            {saving ? "..." : t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
