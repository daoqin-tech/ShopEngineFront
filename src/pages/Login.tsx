import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

// 定义微信登录所需的接口
interface WxLoginOptions {
  self_redirect: boolean;
  id: string;
  appid: string;
  scope: string;
  redirect_uri: string;
  state: string;
  style?: string;
  href?: string;
}

// 扩展Window接口，添加WxLogin
declare global {
  interface Window {
    WxLogin?: new (options: WxLoginOptions) => void;
  }
}

export function Login() {
  const wechatLoginRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();

  // 账号密码登录状态
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      const returnPath = getReturnPath();
      navigate(decodeURIComponent(returnPath), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 获取URL中的returnTo参数
  const getReturnPath = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('returnTo') || "/workspace";
  };

  // 初始化微信登录二维码
  useEffect(() => {
    if (wechatLoginRef.current) {
      loadWechatLogin();
    }
  }, []);

  // 加载微信登录JS并初始化二维码
  const loadWechatLogin = () => {
    // 如果已经加载过微信登录JS，则直接初始化
    if (window.WxLogin) {
      initWechatLogin();
      return;
    }

    // 加载微信登录JS
    const script = document.createElement('script');
    script.src = "https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js";
    script.onload = () => {
      initWechatLogin();
    };
    script.onerror = () => {
      toast.error("微信登录组件加载失败");
    };
    document.body.appendChild(script);
  };

  // 初始化微信登录二维码
  const initWechatLogin = () => {
    if (!wechatLoginRef.current || !window.WxLogin) return;

    // 清空容器
    wechatLoginRef.current.innerHTML = '';

    // 获取微信AppID
    const appId = import.meta.env.VITE_WECHAT_APP_ID;

    if (!appId) {
      console.error("未配置微信AppID");
      toast.error("微信登录配置错误");
      return;
    }

    console.log("使用的微信AppID:", appId);

    // 保存returnTo路径
    const returnTo = getReturnPath();
    localStorage.setItem('returnTo', returnTo);

    // 设置重定向URL - 根据环境动态设置
    const baseUrl = import.meta.env.MODE === 'production'
      ? 'https://echohome.cn'
      : 'http://localhost:5173';
    const redirectUri = encodeURIComponent(`${baseUrl}/auth/wechat/callback`);

    // 生成随机state用于防止CSRF攻击
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('wxLoginState', state);

    console.log("初始化微信登录，参数:", { appId, redirectUri, state });

    try {
      // 初始化微信登录二维码
      new window.WxLogin({
        self_redirect: false,
        id: "wechat-login-container",
        appid: appId,
        scope: "snsapi_login",
        redirect_uri: redirectUri,
        state: state,
        style: "",
        href: ""
      });
    } catch (error) {
      console.error("微信登录初始化失败:", error);
      toast.error("微信登录初始化失败");
    }
  };

  // 处理账号密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("请输入用户名和密码");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/dev-login', {
        username,
        password
      });

      const { token } = response.data.data;

      // 调用AuthContext的login方法存储token
      login(token);

      toast.success("登录成功");

      // 跳转到returnTo页面
      const returnPath = getReturnPath();
      navigate(decodeURIComponent(returnPath), { replace: true });
    } catch (error: any) {
      console.error("登录失败:", error);
      toast.error(error.response?.data?.message || "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <h1 className="text-xl font-semibold">ShopEngine</h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-32">
        <div className="w-full max-w-md">
          <div className="space-y-4">
            {/* 标题区域 */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">欢迎登录</h1>
              <p className="text-sm text-muted-foreground">
                选择登录方式
              </p>
            </div>

            {/* Tabs切换 */}
            <Tabs defaultValue="wechat" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wechat">微信登录</TabsTrigger>
                <TabsTrigger value="password">账号密码</TabsTrigger>
              </TabsList>

              {/* 微信登录Tab */}
              <TabsContent value="wechat" className="space-y-3">
                <div
                  id="wechat-login-container"
                  ref={wechatLoginRef}
                  className="flex justify-center py-4"
                >
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  扫描二维码完成登录
                </p>
              </TabsContent>

              {/* 账号密码登录Tab */}
              <TabsContent value="password" className="space-y-4">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入用户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "登录中..." : "登录"}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  开发者账号登录
                </p>
              </TabsContent>
            </Tabs>

            {/* 底部说明 */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                登录即表示您同意相关服务条款
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
