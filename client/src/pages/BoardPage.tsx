import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Plus, Pin, Eye, ChevronRight,
  ArrowLeft, Trash2, Edit2, Settings,
} from "lucide-react";

export default function BoardPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const tempoRole = (me as any)?.tempoRole ?? "trainer";
  const isManager = ["owner", "center_manager", "sub_manager"].includes(tempoRole);

  const { data: boards, refetch: refetchBoards } = trpc.board.list.useQuery();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const selectedBoard = boards?.find(b => b.id === selectedBoardId);

  const { data: posts, refetch: refetchPosts } = trpc.post.list.useQuery(
    { boardId: selectedBoardId! },
    { enabled: selectedBoardId !== null }
  );

  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const { data: selectedPost } = trpc.post.get.useQuery(
    { id: selectedPostId! },
    { enabled: selectedPostId !== null }
  );

  const utils = trpc.useUtils();
  const createBoard = trpc.board.create.useMutation({ onSuccess: () => refetchBoards() });
  const deleteBoard = trpc.board.delete.useMutation({ onSuccess: () => { refetchBoards(); setSelectedBoardId(null); } });
  const createPost = trpc.post.create.useMutation({ onSuccess: () => { refetchPosts(); setShowNewPost(false); setNewTitle(""); setNewContent(""); } });
  const deletePost = trpc.post.delete.useMutation({ onSuccess: () => { refetchPosts(); setSelectedPostId(null); } });
  const pinPost = trpc.post.pin.useMutation({ onSuccess: () => refetchPosts() });

  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");

  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const handleCreateBoard = () => {
    if (!newBoardName.trim()) return;
    createBoard.mutate({ name: newBoardName, description: newBoardDesc });
    setShowNewBoard(false);
    setNewBoardName("");
    setNewBoardDesc("");
  };

  const handleCreatePost = () => {
    if (!newTitle.trim() || !newContent.trim() || !selectedBoardId) return;
    createPost.mutate({ boardId: selectedBoardId, title: newTitle, content: newContent });
  };

  // 게시판 목록 화면
  if (!selectedBoardId) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">게시판</h1>
            <p className="text-muted-foreground text-sm mt-1">공지사항, 자료실, 자유게시판 등을 관리합니다.</p>
          </div>
          {isManager && (
            <Button onClick={() => setShowNewBoard(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> 게시판 추가
            </Button>
          )}
        </div>

        {!boards || boards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">게시판이 없습니다.</p>
              {isManager && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowNewBoard(true)}>
                  첫 게시판 만들기
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => setSelectedBoardId(board.id)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{board.name}</div>
                        {board.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{board.description}</div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 게시판 추가 다이얼로그 */}
        <Dialog open={showNewBoard} onOpenChange={setShowNewBoard}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>게시판 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>게시판 이름</Label>
                <Input value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="예: 공지사항, 자료실" />
              </div>
              <div className="space-y-2">
                <Label>설명 (선택)</Label>
                <Input value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} placeholder="게시판 설명" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewBoard(false)}>취소</Button>
              <Button onClick={handleCreateBoard} disabled={!newBoardName.trim()}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 글 목록 화면
  if (!selectedPostId) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedBoardId(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{selectedBoard?.name}</h1>
            {selectedBoard?.description && (
              <p className="text-muted-foreground text-sm">{selectedBoard.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Button variant="outline" size="sm" onClick={() => deleteBoard.mutate({ id: selectedBoardId })} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> 게시판 삭제
              </Button>
            )}
            <Button size="sm" onClick={() => setShowNewPost(true)}>
              <Plus className="w-4 h-4 mr-2" /> 글 작성
            </Button>
          </div>
        </div>

        {!posts || posts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">아직 글이 없습니다.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowNewPost(true)}>
                첫 글 작성하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPostId(post.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {post.isPinned && <Pin className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{post.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" /> {post.viewCount}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 글 작성 다이얼로그 */}
        <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>글 작성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="제목을 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="내용을 입력하세요" rows={8} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPost(false)}>취소</Button>
              <Button onClick={handleCreatePost} disabled={!newTitle.trim() || !newContent.trim() || createPost.isPending}>
                {createPost.isPending ? "등록 중..." : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 글 상세 화면
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedPostId(null)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{selectedBoard?.name}</div>
        </div>
        {isManager && selectedPost && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pinPost.mutate({ id: selectedPost.id, isPinned: !selectedPost.isPinned })}
            >
              <Pin className="w-3.5 h-3.5 mr-1" />
              {selectedPost.isPinned ? "고정 해제" : "상단 고정"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => deletePost.mutate({ id: selectedPost.id })}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
            </Button>
          </div>
        )}
      </div>

      {selectedPost ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-2">
              {selectedPost.isPinned && <Pin className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-1" />}
              <CardTitle className="text-xl">{selectedPost.title}</CardTitle>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(selectedPost.createdAt).toLocaleString("ko-KR")}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {selectedPost.viewCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">
              {selectedPost.content}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16 text-muted-foreground">로딩 중...</div>
      )}
    </div>
  );
}
