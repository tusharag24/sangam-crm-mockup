import re

html = open("index.html").read()

# 1. Add CSS for stage-item
css_insert = """
    .stage-item {
      clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%);
      margin-right: -12px;
      padding: 8px 28px 8px 20px;
      font-size: 12px; font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .stage-item:first-child {
      clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
      padding-left: 16px;
    }
    .stage-item:last-child {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%);
      margin-right: 0;
    }
    
    .stage-item.completed {
      background: #EEE8FD; color: #473391;
    }
    .stage-item.active {
      background: #6B5CC4; color: white;
    }
    .stage-item.future {
      background: #F3F4F6; color: #A09AB8;
    }
"""

html = html.replace('  </style>', css_insert + '\n  </style>')

# 2. Update renderStageBar function
old_render_stage_bar = re.search(r'    function renderStageBar\(\) \{.*?\n    \}', html, flags=re.DOTALL)

new_render_stage_bar = """    function renderStageBar() {
      // 6 stages left to right as per prompt
      let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued'];
      if (currentLead.bucket === 'Policy Cancelled' || currentLead.status === 'Policy Cancelled') {
          stages.push('Policy Cancelled');
      }

      const currentBucket = currentLead.bucket === 'Lost' ? currentLead.previousBucket || 'New' : currentLead.bucket;
      const currentIdx = stages.indexOf(currentBucket) !== -1 ? stages.indexOf(currentBucket) : 0;
      
      let html = '<div style="display:flex; margin-bottom: 24px; border-radius: 8px; overflow: hidden;">';
      
      stages.forEach((st, i) => {
        let isDone = i < currentIdx;
        let isActive = i === currentIdx;
        
        let classes = 'stage-item';
        if (isActive) classes += ' active';
        else if (isDone) classes += ' completed';
        else classes += ' future';
        
        // Z-index stacking: stage 1 = 6, stage 2 = 5, etc.
        let zIndex = 6 - i;
        
        html += `
          <div class="${classes}" style="z-index: ${zIndex}; cursor: default;">
            ${st}
          </div>
        `;
      });
      
      html += '</div>';
      document.getElementById('stage-bar-container').innerHTML = html;
    }"""

if old_render_stage_bar:
    html = html.replace(old_render_stage_bar.group(0), new_render_stage_bar)
else:
    print("Could not find renderStageBar")

with open("index.html", "w") as f:
    f.write(html)
