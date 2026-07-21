import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# applications
content = re.sub(
    r"allow list: if isStaff\(\) \|\| \(isSignedIn\(\) && \(\s*resource\.data\.user_id == request\.auth\.uid \|\|\s*resource\.data\.userId == request\.auth\.uid \|\|\s*\(getUserPhone\(\) != '' && resource\.data\.user_phone == getUserPhone\(\)\)\s*\)\) \|\| \(\s*// Public Check.*?\n\s*resource\.data\.reference_number != null \|\|\s*resource\.data\.user_phone != null\s*\);",
    r"allow list: if isStaff();\n      allow list: if isSignedIn() && (resource.data.user_id == request.auth.uid || resource.data.userId == request.auth.uid || (getUserPhone() != '' && resource.data.user_phone == getUserPhone()));\n      allow list: if resource.data.reference_number != null || resource.data.user_phone != null;",
    content,
    flags=re.DOTALL
)

# application_drafts read
content = re.sub(
    r"allow read: if isSignedIn\(\) && \(\s*resource\.data\.user_id == request\.auth\.uid \|\|\s*resource\.data\.userId == request\.auth\.uid \|\|\s*isStaff\(\)\s*\);",
    r"allow read: if isStaff();\n      allow read: if isSignedIn() && (resource.data.user_id == request.auth.uid || resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)
# application_drafts create, update
content = re.sub(
    r"allow create, update: if isSignedIn\(\) && \(\s*request\.resource\.data\.user_id == request\.auth\.uid \|\|\s*request\.resource\.data\.userId == request\.auth\.uid \|\|\s*isStaff\(\)\s*\);",
    r"allow create, update: if isStaff();\n      allow create, update: if isSignedIn() && (request.resource.data.user_id == request.auth.uid || request.resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)
# application_drafts delete
content = re.sub(
    r"allow delete: if isSignedIn\(\) && \(\s*resource\.data\.user_id == request\.auth\.uid \|\|\s*resource\.data\.userId == request\.auth\.uid \|\|\s*isStaff\(\)\s*\);",
    r"allow delete: if isStaff();\n      allow delete: if isSignedIn() && (resource.data.user_id == request.auth.uid || resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)

# simple allow read: if isStaff() || ...
content = re.sub(
    r"allow read: if isStaff\(\) \|\| \(isSignedIn\(\) && \(\s*resource\.data\.user_id == request\.auth\.uid \|\|\s*resource\.data\.userId == request\.auth\.uid\s*\)\);",
    r"allow read: if isStaff();\n      allow read: if isSignedIn() && (resource.data.user_id == request.auth.uid || resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"allow update: if isStaff\(\) \|\| \(isSignedIn\(\) && \(\s*resource\.data\.user_id == request\.auth\.uid \|\|\s*resource\.data\.userId == request\.auth\.uid\s*\)\);",
    r"allow update: if isStaff();\n      allow update: if isSignedIn() && (resource.data.user_id == request.auth.uid || resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"allow create, update: if isStaff\(\) \|\| \(isSignedIn\(\) && \(\s*request\.resource\.data\.user_id == request\.auth\.uid \|\|\s*request\.resource\.data\.userId == request\.auth\.uid\s*\)\);",
    r"allow create, update: if isStaff();\n      allow create, update: if isSignedIn() && (request.resource.data.user_id == request.auth.uid || request.resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"allow create: if isStaff\(\) \|\| \(isSignedIn\(\) && \(\s*request\.resource\.data\.user_id == request\.auth\.uid \|\|\s*request\.resource\.data\.userId == request\.auth\.uid\s*\)\);",
    r"allow create: if isStaff();\n      allow create: if isSignedIn() && (request.resource.data.user_id == request.auth.uid || request.resource.data.userId == request.auth.uid);",
    content,
    flags=re.DOTALL
)

with open('firestore.rules', 'w') as f:
    f.write(content)
print("done")
