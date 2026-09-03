import React, { useRef, useState, useEffect, useMemo } from "react";
import { WORD_CLOUD_CONFIG } from "../utils/constants.js";
import {
  analyzeWordFrequencies,
  calculateFontSize,
  generateWordColor,
  computeWordPositions
} from "../utils/wordCloudUtils.js";
import * as d3 from "d3";

/**
 * WordCloud - Display word cloud visualization of codes from filtered figures
 * @param {object[]} figures - All figure objects
 * @param {object[]} filteredFigures - Currently filtered figures
 */
export default function WordCloud({ figures, filteredFigures }) {
  const svgRef = useRef(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate word frequencies from filtered figures
  const wordData = useMemo(() => {
    return analyzeWordFrequencies(filteredFigures);
  }, [filteredFigures]);

  // Draw word cloud. Re-runs when expanded too, since the <svg> only
  // exists in the DOM while expanded (collapsed-by-default would
  // otherwise skip the initial draw and show an empty canvas on open).
  useEffect(() => {
    if (!isExpanded || !svgRef.current || wordData.length === 0) return;

    const width = WORD_CLOUD_CONFIG.CANVAS_WIDTH;
    const height = WORD_CLOUD_CONFIG.CANVAS_HEIGHT;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Calculate font sizes
    const maxCount = Math.max(...wordData.map(w => w.count));
    const minCount = Math.min(...wordData.map(w => w.count));

    // Prepare word data with sizes and positions. Words stay horizontal:
    // the layout only measures unrotated text, so mixing in rotated words
    // made their real (rotated) footprint disagree with what the collision
    // check thought it was, which is what caused words to overlap.
    const wordsWithData = wordData.map((word, idx) => ({
      ...word,
      size: calculateFontSize(word.count, minCount, maxCount),
      color: generateWordColor(idx, word.count, maxCount),
      rotate: 0
    }));

    // Compute positions for all words
    const positionedWords = computeWordPositions(wordsWithData, width, height);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Add background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "#fafafa");

    // Create group for cloud
    const g = svg.append("g");

    // Create text elements with D3
    const text = g.selectAll("text")
      .data(positionedWords, d => d.text);

    // Enter new words
    text.enter()
      .append("text")
      .style("font-family", "Impact")
      .style("fill", d => d.color)
      .style("user-select", "none")
      .style("cursor", "default")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .text(d => d.text)
      .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .style("font-size", d => `${d.size}px`)
      .style("opacity", 0)
      .on("mouseover", function(event, d) {
        setHoveredWord(`${d.text} (${d.count})`);
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 0.7)
          .style("font-weight", "bold");
      })
      .on("mouseout", function() {
        setHoveredWord(null);
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1)
          .style("font-weight", "normal");
      })
      .transition()
      .duration(600)
      .style("opacity", 1);

    // Update existing words
    text.transition()
      .duration(600)
      .style("opacity", 1)
      .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`);

    // Remove exiting words
    text.exit()
      .transition()
      .duration(200)
      .style("opacity", 0)
      .remove();
  }, [wordData, isExpanded]);

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
            color: '#4b5563',
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
          <svg
            ref={svgRef}
            style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: '250px',
              backgroundColor: '#fafafa'
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
