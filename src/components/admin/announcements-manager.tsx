"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/actions/announcements";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_AUDIENCES,
} from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import type { AnnouncementAudience, SiteAnnouncement } from "@/lib/types/app";

const Schema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  isActive: z.boolean(),
});

type Values = z.infer<typeof Schema>;

export type AnnouncementRow = SiteAnnouncement & {
  creator: {
    id: string;
    ingame_name: string | null;
    discord_username: string | null;
    discord_avatar_url: string | null;
  } | null;
};

export function AnnouncementsManager({
  announcements,
}: {
  announcements: AnnouncementRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AnnouncementRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteAnnouncement(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus />
          Post update
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No updates yet"
            description="Post a site update and every matching member will see it once."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Posted</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {row.body}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ANNOUNCEMENT_AUDIENCE_LABELS[row.audience]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <Badge variant="outline" className="text-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Off
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                    {formatRelative(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(row)}
                        aria-label={`Edit ${row.title}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(row)}
                        aria-label={`Delete ${row.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AnnouncementDialog
        announcement={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this update?"
        description={
          deleting
            ? `“${deleting.title}” will be removed. Members who already dismissed it keep that history gone.`
            : ""
        }
        confirmLabel="Delete update"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function AnnouncementDialog({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: AnnouncementRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = announcement != null;
  const isNew = announcement === "new";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    values:
      announcement && announcement !== "new"
        ? {
            title: announcement.title,
            body: announcement.body,
            audience: announcement.audience,
            isActive: announcement.is_active,
          }
        : {
            title: "",
            body: "",
            audience: "everyone" as AnnouncementAudience,
            isActive: true,
          },
  });

  async function onSubmit(values: Values) {
    if (isNew) {
      const result = await createAnnouncement(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onSaved();
      return;
    }

    if (!announcement) {
      toast.error("Nothing to save.");
      return;
    }

    const result = await updateAnnouncement({
      id: announcement.id,
      title: values.title,
      body: values.body,
      audience: values.audience,
      isActive: values.isActive,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Post site update" : "Edit update"}</DialogTitle>
          <DialogDescription>
            Matching members see this once as a popup, then never again after
            they tap Got it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Inventory warehouses" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="What changed, and what they need to do…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who should see it</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                        <SelectItem key={audience} value={audience}>
                          {ANNOUNCEMENT_AUDIENCE_LABELS[audience]}
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Turn off to stop showing this update to anyone who has
                      not dismissed it yet.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {isNew ? "Post update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
