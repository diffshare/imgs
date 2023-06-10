import Home from "./home";

export const metadata = {
    title: 'Home - imgs'
};

// サーバーコンポーネントでメタデータをセットするためにクライアントコンポーネントを分離
export default function HomePage() {
    return (
        <Home />
    )
}