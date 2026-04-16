import React, { useRef, useState, useEffect, useMemo } from "react";
import { WORD_CLOUD_CONFIG } from "../utils/constants.js";
import {
  analyzeWordFrequencies,
  calculateFontSize,
  generateWordColor,
  findWordPlacement
} from "../utils/wordCloudUtils.js";

/**
 * WordCloud - Display word cloud visualization of codes from filtered figures
 * @param {object[]} figures - All figure objects
 * @param {object[]} filteredFigures - Currently filtered figures
 */
export default function WordCloud({ figures, filteredFigures }) {
  const canvasRef = useRef(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [wordPositions, setWordPositions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate word frequencies from filtered figures
  const wordData = useMemo(() => {
    return analyzeWordFrequencies(filteredFigures);
  }, [filteredFigures]);

  // Draw word cloud on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || wordData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate font sizes
    const maxCount = Math.max(...wordData.map(w => w.count));
    const minCount = Math.min(...wordData.map(w => w.count));

    const positions = [];

    wordData.forEach((word) => {
      const fontSize = calculateFontSize(word.count, minCount, maxCount);
      const placement = findWordPlacement(
        ctx,
        { ...word, fontSize },
        width,
        height,
        positions
      );

      if (placement) {
        positions.push({
          ...word,
          x: placement.x,
          y: placement.y,
          width: ctx.measureText(word.text).width,
          height: fontSize,
          fontSize
        });
      }
    });

    setWordPositions(positions);

    // Draw words with varying colors
    positions.forEach((word, idx) => {
      ctx.font = `bold ${word.fontSize}px Arial`;
      ctx.fillStyle = generateWordColor(idx, word.count, maxCount);
      ctx.fillText(word.text, word.x, word.y);
    });

  }, [wordData]);

  // Handle mouse movement for hover tooltip
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = wordPositions.find(word => {
      return x >= word.x && x <= word.x + word.width &&
             y >= word.y - word.height && y <= word.y;
    });

    if (hovered) {
      canvas.style.cursor = 'default';
      setHoveredWord(`${hovered.text} (${hovered.count})`);
    } else {
      canvas.style.cursor = 'default';
      setHoveredWord(null);
    }
  };

  if (wordData.length === 0) {
    return (
      <div className="word-cloud-container" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#555', margin: 0 }}>
            Research Questions Keywords
          </h3>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              padding: '0 4px'
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        {isExpanded && (
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fafafa',
            padding: '20px',
            textAlign: 'center',
            color: '#999',
            fontSize: '13px',
            height: '250px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            No research questions in current selection
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="word-cloud-container" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#555', margin: 0 }}>
          Research Questions Keywords
        </h3>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            padding: '0 4px'
          }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      {isExpanded && (
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={WORD_CLOUD_CONFIG.CANVAS_WIDTH}
            height={WORD_CLOUD_CONFIG.CANVAS_HEIGHT}
            onMouseMove={handleCanvasMouseMove}
            style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              backgroundColor: '#fafafa',
              display: 'block'
            }}
          />
          {hoveredWord && (
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              {hoveredWord}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
