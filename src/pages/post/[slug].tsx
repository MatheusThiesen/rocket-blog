import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';
import { FiUser, FiCalendar } from 'react-icons/fi';
import { IoMdTime } from 'react-icons/io';
import { format } from 'date-fns';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useEffect, useState } from 'react';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      };
    }[];
  };
}

interface PostNormalized extends Post {
  reading: string;
}

interface PostProps {
  post: Post;
}

export default function Post(props: PostProps) {
  const [post, setPost] = useState<PostNormalized>();
  const router = useRouter();

  useEffect(() => {
    if (router.isFallback) return;

    var readingTime = 0;
    for (const iterator of props.post.data.content) {
      var arrendondar =
        iterator.heading.split(' ').length +
        RichText.asText(iterator.body).split(' ').length;

      var resultado = Math.round(Math.ceil(arrendondar / 200));
      readingTime = readingTime + resultado;
    }

    const normalized = {
      ...props.post,
      first_publication_date: format(
        new Date(props.post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
      reading: `${readingTime} min`,
      data: {
        ...props.post.data,

        content: props.post.data.content.map(content => ({
          heading: content.heading,
          body: { text: RichText.asHtml(content.body) },
        })),
      },
    };

    setPost(normalized);
  }, [props.post]);

  return !router.isFallback && post ? (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      <main className={styles.container}>
        <img src={post.data.banner.url} alt={post.data.title} />

        <article className={styles.content}>
          <h1>{post.data.title}</h1>
          <div className={commonStyles.postInfo}>
            <time>
              <FiCalendar />
              {post.first_publication_date}
            </time>
            <span>
              <FiUser />
              {post.data.author}
            </span>
            <span>
              <IoMdTime />
              {post.reading}
            </span>
          </div>
          <div>
            {post.data.content.map((content, index) => (
              <div key={index} className={styles.articleContent}>
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  dangerouslySetInnerHTML={{ __html: content.body.text }}
                />
              </div>
            ))}
          </div>
        </article>
      </main>
    </>
  ) : (
    <div>Carregando...</div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    { fetch: [], pageSize: 2 }
  );

  const pathsNormalized = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths: pathsNormalized,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(params.slug), {});

  return { props: { post: response } };
};
