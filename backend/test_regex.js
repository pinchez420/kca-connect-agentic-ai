
const cases = [
    'Text
#### Header',
    'Text

#### Header',
    'Text#### Header',
    'Text  #### Header',
    'Text
1. Item',
    'Text

1. Item',
    'Text1. Item',
    'Text  1. Item',
    'Text
- Item',
    'Text

- Item',
    'Text- Item',
    'Text  - Item',
    'Contacting Griffin KengaTo reach Griffin Kenga', // User example
    'Contacting Griffin Kenga
To reach Griffin Kenga',
    'Email: kenga@kcau.ac.keHe is a lecturer', // User example
    'Email: kenga@kcau.ac.ke
He is a lecturer'
];

cases.forEach(content => {
    let normalizedContent = content
        .replace(/([^
])\s*(#{1,6}\s)/g, '$1

$2')
        .replace(/([^
])\s*([-*•]\s)/g, '$1
$2')
        .replace(/([^
])\s*(\d+\.\s)/g, '$1
$2');
    
    console.log('Original:', JSON.stringify(content));
    console.log('Normalized:', JSON.stringify(normalizedContent));
    console.log('---');
});

