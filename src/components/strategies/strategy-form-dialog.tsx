"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { VideoAttach } from "@/components/strategies/video-attach";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createStrategy, updateStrategy } from "@/lib/actions/strategies";
import {
  STRATEGY_VIDEO_BUCKET,
  strategyVideoExtension,
  validateStrategyVideoFile,
  type StrategyVideoMime,
} from "@/lib/strategy-video";
import { createClient } from "@/lib/supabase/client";
import type { Strategy, StrategyCategory } from "@/lib/types/app";

const Schema = z.object({
  categoryId: z.uuid("Pick a category."),
  title: z.string().trim().min(1, "Give the strategy a title.").max(120),
  description: z.string().trim().max(4000).optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function StrategyFormDialog({
  open,
  onOpenChange,
  categories,
  strategy,
  uploaderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: StrategyCategory[];
  strategy: Strategy | null;
  /** Signed-in admin id — used as the storage folder prefix. */
  uploaderId: string;
}) {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [clearVideo, setClearVideo] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      categoryId: categories[0]?.id ?? "",
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      categoryId: strategy?.category_id ?? categories[0]?.id ?? "",
      title: strategy?.title ?? "",
      description: strategy?.description ?? "",
    });
    setVideoFile(null);
    setClearVideo(false);
  }, [open, strategy, categories, form]);

  async function onSubmit(values: Values) {
    let videoPath: string | null = null;
    const supabase = createClient();

    if (videoFile) {
      const issue = validateStrategyVideoFile(videoFile);
      if (issue) {
        toast.error(issue);
        return;
      }
      const ext = strategyVideoExtension(videoFile.type as StrategyVideoMime);
      videoPath = `${uploaderId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(STRATEGY_VIDEO_BUCKET)
        .upload(videoPath, videoFile, {
          cacheControl: "3600",
          contentType: videoFile.type,
          upsert: false,
        });
      if (uploadError) {
        toast.error(uploadError.message || "Could not upload the video.");
        return;
      }
    }

    const payload = {
      categoryId: values.categoryId,
      title: values.title,
      description: values.description,
      videoPath,
      clearVideo: !videoPath && clearVideo,
    };

    const result = strategy
      ? await updateStrategy({ id: strategy.id, ...payload })
      : await createStrategy(payload);

    if (!result.ok) {
      if (videoPath) {
        await supabase.storage.from(STRATEGY_VIDEO_BUCKET).remove([videoPath]);
      }
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit strategy" : "Add strategy"}</DialogTitle>
          <DialogDescription>
            Members can read every strategy. Enforcer+ can add, edit, and upload videos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Two-car box on freeway" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={5}
                      placeholder="How the crew runs this, roles, callouts…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <VideoAttach
              file={videoFile}
              existingPath={clearVideo ? null : strategy?.video_path}
              onChange={setVideoFile}
              onClearExisting={() => setClearVideo(true)}
              disabled={form.formState.isSubmitting}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {strategy ? "Save changes" : "Add strategy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
