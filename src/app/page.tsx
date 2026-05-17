"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Eye, Shield, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import { uploadDiagram } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { FileUploader } from "@/components/file-uploader";

const features = [
  {
    icon: Brain,
    title: "Multi-Provider AI",
    description: "GPT-4o, GPT-4o mini and Gemini 2.5 Flash Lite analyze your diagram independently",
    gradient: "from-[#00d4ff] to-[#0ea5e9]",
  },
  {
    icon: Shield,
    title: "Consensus Engine",
    description: "Cross-validates findings across providers with fuzzy matching",
    gradient: "from-[#a855f7] to-[#7c3aed]",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Watch your analysis progress live via WebSocket notifications",
    gradient: "from-[#ec4899] to-[#d946ef]",
  },
  {
    icon: Eye,
    title: "Detailed Reports",
    description: "Components, risks, scores and actionable recommendations",
    gradient: "from-[#22d3ee] to-[#06b6d4]",
  },
];

export default function HomePage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: uploadDiagram,
    onSuccess: (data) => {
      if (data.isDuplicate) {
        toast.info("This diagram was already uploaded and analyzed. Redirecting to your analyses.");
        router.push("/analyses");
      } else {
        toast.success("Diagram uploaded successfully!");
        router.push(`/analyses/${data.diagramId}`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Upload failed. Please try again.");
    },
  });

  return (
    <div className="relative flex flex-col items-center gap-14 py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-0 dark:opacity-100" />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Eye className="h-12 w-12 text-primary" />
            <div className="absolute inset-0 blur-lg dark:bg-[#00d4ff]/20" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="dark-gradient-text">ArchLens</span>
          </h1>
        </div>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          AI-powered architecture analysis. Upload your diagram and get instant
          insights from multiple AI providers with consensus validation.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <FileUploader
          onUpload={(file) => {
            if (!isAuthenticated()) {
              toast.error("Please sign in to analyze diagrams.");
              router.push("/login");
              return;
            }
            mutation.mutate(file);
          }}
          isUploading={mutation.isPending}
        />
      </div>

      <div className="relative grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 dark:neon-border"
          >
            <div
              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${f.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
            />

            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#00d4ff]/5 to-transparent opacity-0 transition-opacity dark:group-hover:opacity-100" />

            <div className="relative flex flex-col items-center gap-3">
              <div className={`rounded-lg bg-gradient-to-br ${f.gradient} p-2.5`}>
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
