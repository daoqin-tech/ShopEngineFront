import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function WechatCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // 防止重复执行
    if (hasProcessed.current) return;
    
    const handleCallback = async () => {
      try {
        hasProcessed.current = true;
        
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          toast.error("微信登录失败：缺少授权码");
          navigate('/login');
          return;
        }

        // 验证state参数防止CSRF攻击
        const savedState = localStorage.getItem('wxLoginState');
        if (state !== savedState) {
          toast.error("登录验证失败，请重试");
          navigate('/login');
          return;
        }

        // 发送code到后端换取用户信息和token
        const res = await apiClient.post("/auth/login", { code });
        console.log("微信登录响应token:", res.data);
        if (res.data) {
          // res.data 直接就是 token
          await login(res.data);
          
          // 清理localStorage
          localStorage.removeItem('wxLoginState');
          
          // 获取返回路径并导航
          const returnPath = localStorage.getItem('returnTo') || "/materials";
          localStorage.removeItem('returnTo');
          navigate(decodeURIComponent(returnPath));
          
          toast.success("微信登录成功");
        } else {
          toast.error("微信登录失败");
          navigate('/login');
        }
      } catch (err) {
        toast.error("微信登录失败");
        console.log("微信登录回调错误:", err);
        navigate('/login');
      }
    };

    handleCallback();
  }, [location.search, navigate, login]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">正在处理微信登录...</p>
      </div>
    </div>
  );
}