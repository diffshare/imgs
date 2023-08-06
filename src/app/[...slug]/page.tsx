import { Metadata } from "next"
import Album from "./album"

// メタデータを生成する
export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
    return {
        title: params.slug[0] && decodeURIComponent(params.slug[0]),
    } as Metadata;
}

// サーバーコンポーネントでメタデータをセットするためにクライアントコンポーネントを分離
export default function AlbumPage({ params }: { params: { slug: string[] } }) {
    return (
        <Album params={params} />
    )
}