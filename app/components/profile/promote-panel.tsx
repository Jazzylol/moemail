"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Gem, Sword, User2, Loader2, Crown } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { ROLES, Role } from "@/lib/permissions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserInfo {
  id: string
  name?: string
  username?: string
  email?: string
  role?: string
}

const roleIcons = {
  [ROLES.EMPEROR]: Crown,
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: User2,
} as const

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>

export function PromotePanel() {
  const t = useTranslations("profile.promote")
  const tCard = useTranslations("profile.card")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [targetRole, setTargetRole] = useState<RoleWithoutEmperor>(ROLES.KNIGHT)
  const { toast } = useToast()

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/roles/users")
        const data = await res.json() as { users: UserInfo[] }
        setUsers(data.users || [])
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [])
  
  const roleNames = {
    [ROLES.EMPEROR]: tCard("roles.EMPEROR"),
    [ROLES.DUKE]: tCard("roles.DUKE"),
    [ROLES.KNIGHT]: tCard("roles.KNIGHT"),
    [ROLES.CIVILIAN]: tCard("roles.CIVILIAN"),
  } as const

  const selectedUser = users.find(u => u.id === selectedUserId)

  const handleAction = async () => {
    if (!selectedUserId || !selectedUser) return

    if (selectedUser.role === targetRole) {
      toast({
        title: t("updateSuccess"),
        description: t("updateSuccess"),
      })
      return
    }

    setLoading(true)
    try {
      const promoteRes = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          roleName: targetRole
        })
      })

      if (!promoteRes.ok) {
        const error = await promoteRes.json() as { error: string }
        throw new Error(error.error || t("updateFailed"))
      }

      toast({
        title: t("updateSuccess"),
        description: `${selectedUser.username || selectedUser.email} - ${roleNames[targetRole]}`,
      })

      // 更新本地用户列表中的角色
      setUsers(prev => prev.map(u => 
        u.id === selectedUserId ? { ...u, role: targetRole } : u
      ))
      setSelectedUserId("")
    } catch (error) {
      toast({
        title: t("updateFailed"),
        description: error instanceof Error ? error.message : t("updateFailed"),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const Icon = roleIcons[targetRole]

  const getUserDisplayName = (user: UserInfo) => {
    const name = user.username || user.name || user.email || user.id
    const RoleIcon = user.role ? roleIcons[user.role as Role] : User2
    return { name, RoleIcon, role: user.role }
  }

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <span className="text-sm text-muted-foreground">({users.length} {t("usersCount")})</span>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingUsers}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? t("loading") : t("selectUser")} />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => {
                  const { name, RoleIcon, role } = getUserDisplayName(user)
                  return (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <RoleIcon className="w-4 h-4" />
                        <span>{name}</span>
                        {role && (
                          <span className="text-xs text-muted-foreground">
                            ({roleNames[role as Role] || role})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <Select value={targetRole} onValueChange={(value) => setTargetRole(value as RoleWithoutEmperor)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.DUKE}>
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  {roleNames[ROLES.DUKE]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.KNIGHT}>
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  {roleNames[ROLES.KNIGHT]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.CIVILIAN}>
                <div className="flex items-center gap-2">
                  <User2 className="w-4 h-4" />
                  {roleNames[ROLES.CIVILIAN]}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAction}
          disabled={loading || !selectedUserId}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `${t("promote")} ${roleNames[targetRole]}`
          )}
        </Button>
      </div>
    </div>
  )
} 