"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  FormDescription,
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
import type { Strategy, StrategyCategory } from "@/lib/types/app";

const Schema = z.object({
  categoryId: z.uuid("Pick a category."),
  title: z.string().trim().min(1, "Give the strategy a title.").max(120),
  description: z.string().trim().max(4000).optional().nullable(),
  videoUrl: z.string().trim().max(500).optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function StrategyFormDialog({
  open,
  onOpenChange,
  categories,
  strategy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: StrategyCategory[];
  strategy: Strategy | null;
}) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      categoryId: categories[0]?.id ?? "",
      title: "",
      description: "",
      videoUrl: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      categoryId: strategy?.category_id ?? categories[0]?.id ?? "",
      title: strategy?.title ?? "",
      description: strategy?.description ?? "",
      videoUrl: strategy?.video_url ?? "",
    });
  }, [open, strategy, categories, form]);

  async function onSubmit(values: Values) {
    const payload = {
      categoryId: values.categoryId,
      title: values.title,
      description: values.description,
      videoUrl: values.videoUrl,
    };
    const result = strategy
      ? await updateStrategy({ id: strategy.id, ...payload })
      : await createStrategy(payload);

    if (!result.ok) {
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
            Members can read every strategy. Only Underboss+ can change them.
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

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="https://youtu.be/…"
                    />
                  </FormControl>
                  <FormDescription>
                    YouTube links embed on the page. Other hosts show as a link.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
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
