import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const { isAuthenticated } = useAuth();

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
        <div className="w-full max-w-sm">
          <div className="space-y-4">
            {/* 标题区域 */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">欢迎登录</h1>
              <p className="text-sm text-muted-foreground">
                使用微信扫码登录
              </p>
            </div>

            {/* 微信二维码容器 */}
            <div className="space-y-3">
              <div 
                id="wechat-login-container"
                ref={wechatLoginRef}
                className="flex justify-center"
              >
              </div>
              
              <p className="text-center text-xs text-muted-foreground">
                扫描二维码完成登录
              </p>
            </div>

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