"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryFormDialog } from "@/components/strategies/category-form-dialog";
import { StrategyFormDialog } from "@/components/strategies/strategy-form-dialog";
import { StrategyVideo } from "@/components/strategies/strategy-video";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteStrategy,
  deleteStrategyCategory,
} from "@/lib/actions/strategies";
import type { Strategy, StrategyCategory, StrategyWithCategory } from "@/lib/types/app";

export function StrategiesBoard({
  categories,
  strategies,
  canManage,
  uploaderId,
}: {
  categories: StrategyCategory[];
  strategies: StrategyWithCategory[];
  canManage: boolean;
  uploaderId: string;
}) {
  const router = useRouter();
  const [editingStrategy, setEditingStrategy] = useState<Strategy | "new" | null>(
    null,
  );
  const [deletingStrategy, setDeletingStrategy] = useState<Strategy | null>(null);
  const [editingCategory, setEditingCategory] = useState<
    StrategyCategory | "new" | null
  >(null);
  const [deletingCategory, setDeletingCategory] =
    useState<StrategyCategory | null>(null);

  const grouped = useMemo(() => {
    return categories.map((category) => ({
      category,
      items: strategies.filter((s) => s.category_id === category.id),
    }));
  }, [categories, strategies]);

  return (
    <>
      {canManage ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditingStrategy("new")}>
            <Plus />
            Add strategy
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditingCategory("new")}
          >
            <Plus />
            Add category
          </Button>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No strategy categories yet"
          description={
            canManage
              ? "Add a category, then add strategies under it."
              : "Staff have not published any strategies yet."
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items }) => (
            <section key={category.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg tracking-wide uppercase">
                  {category.name}
                </h2>
                {canManage ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategory(category)}
                    >
                      <Pencil />
                      Edit category
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingCategory(category)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>

              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No strategies in this category yet.
                </p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {items.map((entry) => (
                    <Card key={entry.id} className="gap-0 overflow-hidden py-0">
                      <CardHeader className="border-b py-4">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base leading-snug">
                            {entry.title}
                          </CardTitle>
                          {canManage ? (
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingStrategy(entry)}
                              >
                                <Pencil />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletingStrategy(entry)}
                              >
                                <Trash2 />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 px-4 py-4 sm:px-6">
                        {entry.description ? (
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {entry.description}
                          </p>
                        ) : (
                          <p className="text-muted-foreground/70 text-sm italic">
                            No write-up yet.
                          </p>
                        )}
                        <StrategyVideo path={entry.video_path} url={entry.video_url} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {canManage ? (
        <>
          <StrategyFormDialog
            open={editingStrategy !== null}
            onOpenChange={(open) => !open && setEditingStrategy(null)}
            categories={categories}
            strategy={editingStrategy === "new" ? null : editingStrategy}
            uploaderId={uploaderId}
          />
          <CategoryFormDialog
            open={editingCategory !== null}
            onOpenChange={(open) => !open && setEditingCategory(null)}
            category={editingCategory === "new" ? null : editingCategory}
          />
          <ConfirmDialog
            open={deletingStrategy !== null}
            onOpenChange={(open) => !open && setDeletingStrategy(null)}
            title="Delete this strategy?"
            destructive
            confirmLabel="Delete strategy"
            description={
              deletingStrategy ? (
                <>
                  <span className="text-foreground font-medium">
                    {deletingStrategy.title}
                  </span>{" "}
                  will be removed. A copy stays in the audit log.
                </>
              ) : null
            }
            onConfirm={async () => {
              if (!deletingStrategy) return;
              const result = await deleteStrategy(deletingStrategy.id);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(result.message);
              setDeletingStrategy(null);
              router.refresh();
            }}
          />
          <ConfirmDialog
            open={deletingCategory !== null}
            onOpenChange={(open) => !open && setDeletingCategory(null)}
            title="Delete this category?"
            destructive
            confirmLabel="Delete category"
            description={
              deletingCategory ? (
                <>
                  <span className="text-foreground font-medium">
                    {deletingCategory.name}
                  </span>{" "}
                  and every strategy inside it will be removed.
                </>
              ) : null
            }
            onConfirm={async () => {
              if (!deletingCategory) return;
              const result = await deleteStrategyCategory(deletingCategory.id);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(result.message);
              setDeletingCategory(null);
              router.refresh();
            }}
          />
        </>
      ) : null}
    </>
  );
}
