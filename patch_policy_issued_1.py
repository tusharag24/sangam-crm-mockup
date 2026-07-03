import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace BUCKETS array
html = html.replace(
    "const BUCKETS = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy', 'Lost'];",
    "const BUCKETS = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued', 'Lost'];"
)

# Insert FREELOOK_DAYS
config_insertion = """const FREELOOK_DAYS = {
  'loan_protection_care': 15,
  'loan_protection_tata': 15,
  'property_insurance':   15,
  'credit_life':          30,
  'term_plan':            30,
};

const MILESTONE_CONFIG = {"""
html = html.replace("const MILESTONE_CONFIG = {", config_insertion)

# Replace STATUS_FLOW for Payment Done
html = html.replace(
    "'Payment Done': { subStatuses: ['Verification Pending', 'Verification Failed', 'Verified'], mandatoryFollowUp: false, pendingWith: 'Ambak Operations', nextBucket: 'Policy' }",
    "'Payment Done': { subStatuses: ['Verification Pending', 'Verification Failed', 'Verified'], mandatoryFollowUp: false, pendingWith: 'Ambak Operations', nextBucket: 'Policy Issued' }"
)

# Replace STATUS_FLOW for Policy Copy
old_policy_copy = """          'Policy Copy': {
            subStatuses: ['Pending', 'Issued'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Policy',
            conditionNextBucket: (subStatus) => subStatus === 'Issued' ? 'Policy' : 'Payment Done',
            mandatoryUpload: (subStatus) => subStatus === 'Issued' ? 'Policy Copy' : null
          }"""
new_policy_copy = """          'Policy Copy': {
            subStatuses: ['Pending', 'Issued'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Policy Issued',
            conditionNextBucket: (subStatus) => subStatus === 'Issued' ? 'Policy Issued' : 'Payment Done',
            mandatoryUpload: (subStatus) => subStatus === 'Issued' ? 'Policy Copy' : null
          }"""
html = html.replace(old_policy_copy, new_policy_copy)

# Replace STATUS_FLOW for Policy
old_policy_flow = """      'Policy': {
        statuses: {
          'Policy Issued': {
            subStatuses: ['Shared With Customer', 'Acknowledged'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy'
          },
          'MIS': {
            subStatuses: ['Pending', 'Received'],
            mandatoryFollowUp: false,
            pendingWith: 'Ambak Operations',
            nextBucket: 'Policy'
          },
          'Commission': {
            subStatuses: ['Pending', 'Received'],
            mandatoryFollowUp: false,
            pendingWith: 'Finance Team',
            nextBucket: 'Policy'
          },
          'Freelook Period': {
            subStatuses: ['Active', 'Completed', 'Policy Cancelled'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy'
          }
        }
      }"""
new_policy_flow = """      'Policy Issued': {
        statuses: {
          'Freelook Period': {
            subStatuses: ['Pending', 'Completed', 'Policy Cancelled'],
            mandatoryFollowUp: false,
            pendingWith: 'None',
            nextBucket: 'Policy Issued'
          }
        }
      }"""
html = html.replace(old_policy_flow, new_policy_flow)

# Replace background and color maps
html = html.replace(
    "const bucketBgMap = { 'New': '#EFF6FF', 'Contacted': '#FFFBEB', 'Quote': '#EEEDFE', 'Payment Done': '#F0FDFA', 'Policy': '#F0FDF4', 'Lost': '#FEF2F2' };",
    "const bucketBgMap = { 'New': '#EFF6FF', 'Contacted': '#FFFBEB', 'Quote': '#EEEDFE', 'Payment Done': '#F0FDFA', 'Policy Issued': '#F0FDF4', 'Lost': '#FEF2F2' };"
)
html = html.replace(
    "const bucketColorMap = { 'New': '#1E40AF', 'Contacted': '#B45309', 'Quote': '#4C1D95', 'Payment Done': '#0F766E', 'Policy': '#15803D', 'Lost': '#991B1B' };",
    "const bucketColorMap = { 'New': '#1E40AF', 'Contacted': '#B45309', 'Quote': '#4C1D95', 'Payment Done': '#0F766E', 'Policy Issued': '#15803D', 'Lost': '#991B1B' };"
)

# Replace generic references
html = html.replace(
    "if ((newStatus === 'Policy Issuance' && newSubStatus === 'Issued') || newStatus === 'Active' || newStatus === 'Freelook' || newStatus === 'Payout') l.bucket = 'Policy';",
    "if ((newStatus === 'Policy Issuance' && newSubStatus === 'Issued') || newStatus === 'Active' || newStatus === 'Freelook' || newStatus === 'Payout') l.bucket = 'Policy Issued';"
)
html = html.replace(
    "let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy'];",
    "let stages = ['New', 'Contacted', 'Quote', 'Payment Done', 'Policy Issued'];"
)
html = html.replace(
    "} else if (l.bucket === 'Policy') {",
    "} else if (l.bucket === 'Policy Issued') {"
)
html = html.replace(
    "contentHtml = renderPolicyStage();",
    "contentHtml = renderPolicyIssuedStage();"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
