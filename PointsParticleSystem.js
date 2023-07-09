class ParticlePointsMaterial extends THREE.PointsMaterial {
  constructor(options) {
    super(options);
    this.onBeforeCompile = this._onBeforeCompile;
  }

  _onBeforeCompile(shader) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_pars_vertex>',
      `
      #include <color_pars_vertex>
      attribute float pScale;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      'gl_PointSize = size;',
      `
      gl_PointSize = size * pScale;
      `
    );
  }
}

class PointsParticleSystem {
  constructor(material, capacity, {
    birthRate = 100,
    lifeExpectancy = 1.0,
    lifeVariance = 0.0,
    useColor = false,
  } = {}) {
    this._capacity = capacity;
    this.birthRate = birthRate;
    this.lifeExpectancy = lifeExpectancy;
    this.lifeVariance = lifeVariance;
    this._useColor = useColor;

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * capacity), 3));
    this._geometry.setAttribute('pScale', new THREE.Float32BufferAttribute(new Float32Array(capacity), 1));
    if (useColor) {
      this._geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(3 * capacity), 3));
    }
    this.points = new THREE.Points(this._geometry, material);

    this._ages = new Array(this._capacity);
    this._lifes = new Array(this._capacity);
    this._alives = new Array(this._capacity);
    this._positions = new Array(this._capacity);
    this._scales = new Array(this._capacity);
    this._colors = useColor ? new Array(this._capacity) : null;
    for (let i = 0; i < this._capacity; ++i) {
      this._ages[i] = 0.0;
      this._lifes[i] = 0.0;
      this._alives[i] = false;
      this._positions[i] = new THREE.Vector3();
      this._scales[i] = 0.0;
      if (useColor) {
        this._colors[i] = new THREE.Color();
      }
    }
  }

  get capacity() {
    return this._capacity;
  }

  get useColor() {
    return this._useColor;
  }

  update(deltaSeconds) {
    let aliveCount = 0;
    let birthNum = this.birthRate * deltaSeconds;

    const output = {
      position: new THREE.Vector3(),
      scale: 0.0,
      color: this._useColor ? new THREE.Color() : null,
    };

    for (let i = 0; i < this._capacity; ++i) {
      if (this._alives[i]) {
        const age = this._ages[i];
        const life = this._lifes[i];
        const currentAge = age + deltaSeconds;
        if (currentAge <= life) {
          this._ages[i] = currentAge;

          this.updateParticle(output, {
            index: i,
            age: currentAge,
            life: life,
            position: this._positions[i],
            scale: this._scales[i],
            color: this._useColor ? this._colors[i] : null,
            useColor: this._useColor,
            deltaSeconds: deltaSeconds,
          });

          this._copyOutput(i, aliveCount, output);
          aliveCount += 1;
        } else {
          this._alives[i] = false;
        }
      } else if (birthNum >= 1.0 || (birthNum > 0 && Math.random() <= birthNum)) {
        birthNum -= 1.0;

        this._alives[i] = true;
        this._ages[i] = 0.0;
        this._lifes[i] = this.lifeExpectancy * (1.0 + (Math.random() * 2.0 - 1.0) * this.lifeVariance);

        this.createParticle(output, {
          index: i,
          useColor: this._useColor,
        });

        this._copyOutput(i, aliveCount, output);
        aliveCount += 1;
      }
    }

    this._geometry.setDrawRange(0, aliveCount);
    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.pScale.needsUpdate = true;
    if (this._useColor) {
      this._geometry.attributes.color.needsUpdate = true;
    }
  }

  _copyOutput(index, aliveCount, output) {
    this._positions[index].copy(output.position);
    this._scales[index] = output.scale;
    this._geometry.attributes.position.array[aliveCount * 3] = output.position.x;
    this._geometry.attributes.position.array[aliveCount * 3 + 1] = output.position.y;
    this._geometry.attributes.position.array[aliveCount * 3 + 2] = output.position.z;
    this._geometry.attributes.pScale.array[aliveCount] = output.scale;
    if (this._useColor) {
      this._colors[index].copy(output.color);
      this._geometry.attributes.color.array[aliveCount * 3] = output.color.r;
      this._geometry.attributes.color.array[aliveCount * 3 + 1] = output.color.g;
      this._geometry.attributes.color.array[aliveCount * 3 + 2] = output.color.b;  
    }
  }

  createParticle(output, parameters) {
    console.error('This method must be implemented in subclass.');
  }

  updateParticle(output, parameters) {
    console.error('This method must be implemented in subclass.');
  }
}