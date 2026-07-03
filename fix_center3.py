import re

html = open("index.html").read()

bad_block = """      } else {
          for (let i = 0; i < currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', `<div style="font-size: 13px; color: #9CA3AF; text-align: center;">Call the customer and record the outcome in Update Status.</div>`);
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderProductSelection(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentDoneStage(true));
          }
          
          let activeContent = '';
          if (l.bucket === 'New') { activeContent = renderOutreachStage(false); } else if (l.bucket === 'Contacted') activeContent = renderProductSelection(false);
          else if (l.bucket === 'Quote') activeContent = renderQuoteStage(false);
          else if (l.bucket === 'Payment Done') activeContent = renderPaymentDoneStage(false);
          else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();
          centerContent += activeContent;
      }"""

html = html.replace(bad_block, "")
open("index.html", "w").write(html)
