import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface EmbeddedContentProps {
  url: string;
}

const EmbeddedContent: React.FC<EmbeddedContentProps> = ({ url }) => {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get('/api/fetchUrl', { params: { url } });
        setContent(response.data.content);
      } catch (error) {
        console.error('Error fetching URL content:', error);
        setContent(null);
      }
    };

    fetchContent();
  }, [url]);

  if (!content) {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-300 rounded p-4">
      <h3 className="text-lg font-semibold mb-2">Embedded Content</h3>
      <iframe
        srcDoc={content}
        title="Embedded content"
        className="w-full h-[400px] md:h-[600px]"
        sandbox="allow-scripts"
      />
    </div>
  );
};

export default EmbeddedContent;
