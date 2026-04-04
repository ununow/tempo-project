import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Link as LinkIcon, FileText, BookOpen } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  notion: <FileText className="w-4 h-4 text-gray-400" />,
  google: <BookOpen className="w-4 h-4 text-blue-400" />,
  obsidian: <BookOpen className="w-4 h-4 text-purple-400" />,
  custom: <LinkIcon className="w-4 h-4 text-muted-foreground" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  notion: "Notion",
  google: "Google Workspace",
  obsidian: "Obsidian",
  custom: "기타",
};

export default function ExternalLinksPage() {
  const { data: links, refetch } = trpc.externalLink.list.useQuery();
  const addLink = trpc.externalLink.add.useMutation({ onSuccess: () => { refetch(); setShowAdd(false); setNewTitle(""); setNewUrl(""); } });
  const removeLink = trpc.externalLink.remove.useMutation({ onSuccess: () => refetch() });

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("custom");

  const handleAdd = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    addLink.mutate({ title: newTitle, url: newUrl, category: newCategory });
  };

  const grouped = (links ?? []).reduce<Record<string, typeof links>>((acc, link) => {
    const cat = link.category ?? "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(link);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">외부 링크</h1>
          <p className="text-muted-foreground text-sm mt-1">Notion, Google Workspace, Obsidian 등 자주 쓰는 링크를 모아 관리합니다.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" /> 링크 추가
        </Button>
      </div>

      {!links || links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <LinkIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">등록된 외부 링크가 없습니다.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
              첫 링크 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catLinks]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                {CATEGORY_ICONS[cat]}
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catLinks?.map((link) => (
                  <Card key={link.id} className="group hover:border-primary/50 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {CATEGORY_ICONS[link.category ?? "custom"]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{link.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLink.mutate({ id: link.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 링크 추가 다이얼로그 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>외부 링크 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notion">Notion</SelectItem>
                  <SelectItem value="google">Google Workspace</SelectItem>
                  <SelectItem value="obsidian">Obsidian</SelectItem>
                  <SelectItem value="custom">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="예: 트레이너 업무 매뉴얼" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." type="url" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim() || !newUrl.trim() || addLink.isPending}>
              {addLink.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
